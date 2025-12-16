# Architecture Réseau - Moodle MCP Server

## 📐 Vue d'Ensemble

Le serveur MCP Moodle peut fonctionner en deux modes :

1. **Mode Local (stdio)** : Communication directe entre Claude Desktop et le serveur MCP
2. **Mode Réseau (TCP)** : Communication via le réseau avec support multi-clients

---

## 🔄 Évolution Architecturale

### Mode Local (Version < 0.4.0)

```
┌─────────────────────────┐
│   Claude Desktop        │
│   (Machine Locale)      │
└───────────┬─────────────┘
            │ stdio
            │ (stdin/stdout)
            │
┌───────────▼─────────────┐
│   Moodle MCP Server     │
│   (build/index.js)      │
└───────────┬─────────────┘
            │ HTTPS
            │
┌───────────▼─────────────┐
│   Moodle Instance       │
│   (formation.ec2lt.sn)  │
└─────────────────────────┘
```

**Caractéristiques** :
- ✅ Simple à configurer
- ✅ Pas de configuration réseau
- ❌ Un seul utilisateur à la fois
- ❌ Serveur doit être sur la même machine

---

### Mode Réseau (Version >= 0.4.0)

```
┌──────────────────────────────────────────────────────────┐
│                    Serveur Linux                         │
│                    IP: 192.168.1.181                     │
│                                                           │
│   ┌────────────────────────────────────────────────┐    │
│   │         Moodle MCP Server                      │    │
│   │         (Node.js Process)                      │    │
│   │         build/index.js                         │    │
│   └────────────────┬───────────────────────────────┘    │
│                    │ stdio                               │
│                    │ (stdin/stdout)                      │
│   ┌────────────────▼───────────────────────────────┐    │
│   │         socat - TCP Relay                      │    │
│   │         TCP-LISTEN:3000                        │    │
│   │         fork, reuseaddr                        │    │
│   └────────────────┬───────────────────────────────┘    │
│                    │                                     │
└────────────────────┼─────────────────────────────────────┘
                     │
                     │ TCP/IP (Port 3000)
                     │ Réseau Local (LAN)
                     │
        ┌────────────┼────────────┬────────────┐
        │            │            │            │
   ┌────▼─────┐ ┌───▼──────┐ ┌───▼──────┐ ┌──▼───────┐
   │ Client 1 │ │ Client 2 │ │ Client 3 │ │ Client N │
   │ Windows  │ │  Ubuntu  │ │  macOS   │ │   ...    │
   │  ncat    │ │    nc    │ │  ncat    │ │          │
   └────┬─────┘ └────┬─────┘ └────┬─────┘ └────┬─────┘
        │            │            │            │
   ┌────▼────────────▼────────────▼────────────▼─────┐
   │         Claude Desktop (Client)                 │
   │         Interface Utilisateur                   │
   └────────────────────┬────────────────────────────┘
                        │
                        │ HTTPS (via MCP)
                        │
                   ┌────▼──────────────┐
                   │ Moodle Instance   │
                   │ formation.ec2lt.sn│
                   └───────────────────┘
```

**Caractéristiques** :
- ✅ Plusieurs utilisateurs simultanés
- ✅ Déploiement centralisé
- ✅ Support multi-plateformes
- ✅ Accès réseau sécurisé
- ⚠️ Configuration réseau requise

---

## 🔧 Composants Détaillés

### 1. Serveur MCP (Node.js)

**Rôle** : Serveur MCP principal gérant la logique métier

**Fichier** : `build/index.js`

**Communication** : 
- Entrée : stdin (JSON-RPC)
- Sortie : stdout (JSON-RPC)

**Fonctionnalités** :
- Gestion des outils MCP (get_courses, get_students, etc.)
- Communication avec l'API Moodle (HTTPS)
- Traitement des requêtes et réponses
- Validation et transformation des données

**Code minimal** :
```javascript
// Serveur MCP basique
const server = new Server({
  name: "moodle-mcp-server",
  version: "0.4.0"
});

// Lecture depuis stdin
process.stdin.on('data', (data) => {
  const request = JSON.parse(data);
  const response = handleRequest(request);
  process.stdout.write(JSON.stringify(response) + '\n');
});
```

---

### 2. socat - Relais TCP

**Rôle** : Pont entre TCP et stdio, permettant l'accès réseau

**Commande** :
```bash
socat \
  TCP-LISTEN:3000,fork,reuseaddr \
  EXEC:"/usr/bin/env node build/index.js",pty,raw,echo=0
```

**Options expliquées** :

| Option | Description |
|--------|-------------|
| `TCP-LISTEN:3000` | Écoute sur le port 3000 |
| `fork` | Crée un nouveau processus pour chaque connexion |
| `reuseaddr` | Permet la réutilisation rapide du port |
| `EXEC:...` | Commande à exécuter (le serveur MCP) |
| `pty` | Crée un pseudo-terminal |
| `raw` | Mode brut (pas d'interprétation des caractères) |
| `echo=0` | Désactive l'écho des caractères |

**Pourquoi socat ?**

- ✅ Léger et performant
- ✅ Support natif de fork (multi-clients)
- ✅ Gère automatiquement les connexions TCP
- ✅ Conversion stdio ↔ TCP transparente
- ✅ Pas de modification du code MCP nécessaire

---

### 3. ncat/nc - Client TCP

**Rôle** : Client TCP côté machine cliente

**Utilisation** :
```bash
# Connexion simple
ncat 192.168.1.181 3000

# Avec Claude Desktop (dans la config)
{
  "command": "ncat",
  "args": ["192.168.1.181", "3000"]
}
```

**Pourquoi ncat/nc ?**

- ✅ Outil standard sur toutes les plateformes
- ✅ Communication TCP simple et fiable
- ✅ Pas de dépendances supplémentaires
- ✅ Compatible avec le protocole MCP

**Différences nc vs ncat** :

| Caractéristique | nc (netcat) | ncat (nmap) |
|-----------------|-------------|-------------|
| **Disponibilité** | Pré-installé sur Linux/macOS | Nécessite nmap |
| **Windows** | ❌ Non natif | ✅ Via Nmap |
| **Fonctionnalités** | Basiques | Avancées (SSL, proxy) |
| **Stabilité** | ✅ Excellente | ✅ Excellente |
| **Recommandation** | Linux/macOS | Windows |

---

### 4. Claude Desktop

**Rôle** : Interface utilisateur et client MCP

**Communication** : 
- Lance ncat/nc comme sous-processus
- Communique via stdin/stdout avec ncat
- ncat communique via TCP avec le serveur

**Configuration** :
```json
{
  "mcpServers": {
    "moodle": {
      "command": "ncat",
      "args": ["192.168.1.181", "3000"]
    }
  }
}
```

---

## 🔄 Flux de Communication

### Requête Complète (Exemple : get_courses)

```
┌─────────────┐
│   Utilisateur│
└──────┬──────┘
       │ "Liste mes cours Moodle"
       ▼
┌─────────────────┐
│ Claude Desktop  │ 1. Interprète la requête
└──────┬──────────┘    Génère l'appel MCP
       │
       │ JSON-RPC via stdin
       │ {"jsonrpc":"2.0","method":"tools/call",
       │  "params":{"name":"get_all_courses"}}
       ▼
┌─────────────────┐
│   ncat/nc       │ 2. Envoie via TCP
└──────┬──────────┘
       │
       │ TCP (Port 3000)
       │ Réseau Local
       ▼
┌─────────────────┐
│     socat       │ 3. Reçoit la connexion TCP
└──────┬──────────┘    Convertit en stdio
       │
       │ stdin
       ▼
┌─────────────────┐
│ MCP Server      │ 4. Traite la requête
│ (build/index.js)│    Appelle l'API Moodle
└──────┬──────────┘
       │
       │ HTTPS
       ▼
┌─────────────────┐
│ Moodle API      │ 5. Retourne les cours
└──────┬──────────┘
       │
       │ JSON Response
       ▼
┌─────────────────┐
│ MCP Server      │ 6. Formate la réponse MCP
└──────┬──────────┘
       │
       │ stdout
       ▼
┌─────────────────┐
│     socat       │ 7. Convertit en TCP
└──────┬──────────┘
       │
       │ TCP (Port 3000)
       ▼
┌─────────────────┐
│   ncat/nc       │ 8. Reçoit via TCP
└──────┬──────────┘
       │
       │ stdout
       ▼
┌─────────────────┐
│ Claude Desktop  │ 9. Affiche les résultats
└──────┬──────────┘
       │
       ▼
┌─────────────┐
│  Utilisateur │ 10. Voit la liste des cours
└─────────────┘
```

**Temps de réponse typique** : 100-500ms (dépend de l'API Moodle)

---

## 🔐 Sécurité Réseau

### Architecture de Sécurité

```
┌─────────────────────────────────────────────┐
│            Couches de Sécurité              │
├─────────────────────────────────────────────┤
│                                              │
│  1. Firewall Serveur (ufw)                  │
│     └─ Autoriser seulement 192.168.1.0/24   │
│                                              │
│  2. Port Binding (socat)                    │
│     └─ Écoute sur 0.0.0.0:3000              │
│                                              │
│  3. Token Moodle                            │
│     └─ Permissions limitées                 │
│                                              │
│  4. SSL/TLS (optionnel)                     │
│     └─ stunnel ou socat-openssl             │
│                                              │
└─────────────────────────────────────────────┘
```

### Configuration Firewall Recommandée

```bash
# Stratégie par défaut : tout bloquer
sudo ufw default deny incoming
sudo ufw default allow outgoing

# Autoriser SSH (pour l'administration)
sudo ufw allow 22/tcp

# Autoriser MCP uniquement depuis le LAN
sudo ufw allow from 192.168.1.0/24 to any port 3000

# Ou autoriser des IPs spécifiques
sudo ufw allow from 192.168.1.100 to any port 3000
sudo ufw allow from 192.168.1.101 to any port 3000

# Activer le firewall
sudo ufw enable

# Vérifier
sudo ufw status numbered
```

### Token Moodle Sécurisé

**Bonnes pratiques** :

1. **Permissions minimales** :
   ```
   core_webservice_get_site_info
   core_course_get_courses
   core_enrol_get_enrolled_users
   mod_assign_get_assignments
   mod_assign_get_submissions
   mod_assign_save_grade
   ```

2. **Token dédié** : Un token par serveur MCP

3. **Rotation** : Changer le token tous les 3-6 mois

4. **Monitoring** : Surveiller l'utilisation via les logs Moodle

---

## 📊 Performance et Scalabilité

### Capacités

| Métrique | Valeur Typique |
|----------|----------------|
| **Clients simultanés** | Illimité (fork mode) |
| **Latence** | 50-200ms (LAN) |
| **Throughput** | 10-50 requêtes/sec |
| **Mémoire par client** | 50-100 MB |
| **CPU par client** | 5-10% |

### Optimisations

**1. Cache côté serveur** :
```javascript
// Cache des réponses API Moodle
const cache = new Map();
const CACHE_TTL = 300000; // 5 minutes

async function getCachedCourses() {
  const cacheKey = 'courses';
  const cached = cache.get(cacheKey);
  
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }
  
  const courses = await fetchCoursesFromMoodle();
  cache.set(cacheKey, { data: courses, timestamp: Date.now() });
  return courses;
}
```

**2. Compression** :
```bash
# Activer la compression avec socat
socat \
  TCP-LISTEN:3000,fork,reuseaddr \
  EXEC:"/usr/bin/env node build/index.js",pty,raw,echo=0,compress=zlib
```

**3. Connection pooling** (API Moodle) :
```javascript
const axios = require('axios');
const http = require('http');
const https = require('https');

const httpAgent = new http.Agent({ keepAlive: true, maxSockets: 50 });
const httpsAgent = new https.Agent({ keepAlive: true, maxSockets: 50 });

const client = axios.create({
  httpAgent,
  httpsAgent,
  timeout: 30000
});
```

---

## 🧪 Tests et Monitoring

### Tests de Connectivité

**1. Test depuis le serveur** :
```bash
# Port ouvert ?
sudo netstat -tlnp | grep 3000

# Connexion locale
echo '{"test": "connection"}' | nc localhost 3000

# Processus actifs
ps aux | grep -E 'socat|node.*index.js'
```

**2. Test depuis le client** :
```bash
# Ping
ping -c 4 192.168.1.181

# Port accessible ?
nc -zv 192.168.1.181 3000

# Test de connexion complète
echo '{"jsonrpc":"2.0","method":"initialize"}' | nc 192.168.1.181 3000
```

### Monitoring en Production

**1. Logs serveur** :
```bash
# Avec systemd
sudo journalctl -u moodle-mcp -f

# Avec screen
screen -r moodle-mcp

# Logs réseau
sudo tcpdump -i any port 3000 -w mcp.pcap
```

**2. Métriques** :
```bash
# Nombre de connexions actives
sudo netstat -tn | grep :3000 | wc -l

# CPU/Mémoire
top -p $(pgrep -f 'node.*index.js')

# Bande passante
sudo iftop -i eth0 -f "port 3000"
```

---

## 🚀 Déploiement en Production

### Checklist de Déploiement

- [ ] Serveur Linux configuré avec IP statique
- [ ] socat installé et testé
- [ ] Firewall configuré (ports, IPs autorisées)
- [ ] Service systemd créé et activé
- [ ] Logs configurés (rotation, retention)
- [ ] Monitoring en place
- [ ] Token Moodle avec permissions minimales
- [ ] Documentation réseau créée (IPs, ports)
- [ ] Clients configurés et testés
- [ ] Plan de sauvegarde/restauration
- [ ] Plan de mise à jour

### Architecture Haute Disponibilité (Optionnelle)

```
┌─────────────────────────────────────────────┐
│           Load Balancer (HAProxy)           │
│           IP VIP: 192.168.1.180            │
└───────┬─────────────────────┬───────────────┘
        │                     │
   ┌────▼──────┐        ┌────▼──────┐
   │ Serveur 1 │        │ Serveur 2 │
   │ :3000     │        │ :3000     │
   └───────────┘        └───────────┘
```

**Configuration HAProxy** :
```
frontend mcp_frontend
    bind 192.168.1.180:3000
    mode tcp
    default_backend mcp_backend

backend mcp_backend
    mode tcp
    balance roundrobin
    server mcp1 192.168.1.181:3000 check
    server mcp2 192.168.1.182:3000 check
```

---

## 📚 Comparaison des Modes

| Caractéristique | Mode Local | Mode Réseau |
|-----------------|------------|-------------|
| **Complexité** | ⭐ Simple | ⭐⭐ Moyenne |
| **Performance** | ⭐⭐⭐ Excellente | ⭐⭐ Bonne |
| **Multi-utilisateurs** | ❌ Non | ✅ Oui |
| **Configuration** | Fichier JSON local | Serveur + Firewall + Clients |
| **Sécurité** | ⭐⭐⭐ Locale | ⭐⭐ Réseau (à sécuriser) |
| **Maintenance** | ⭐⭐⭐ Facile | ⭐⭐ Moyenne |
| **Use Case** | Développement, usage personnel | Production, équipe |

---

## 🔮 Évolutions Futures

### Améliorations Possibles

1. **SSL/TLS** :
   ```bash
   # Avec stunnel
   stunnel -d 3443 -r 3000 -P /tmp/stunnel.pid
   ```

2. **Authentification** :
   - Token par utilisateur
   - JWT pour les sessions
   - Intégration LDAP/OAuth

3. **WebSocket** :
   - Communication bidirectionnelle
   - Notifications en temps réel
   - Moins de latence

4. **Clustering** :
   - Load balancing
   - Haute disponibilité
   - Scalabilité horizontale

5. **Métriques avancées** :
   - Prometheus + Grafana
   - Alerting automatique
   - Dashboards de monitoring

---

**Version** : 0.4.0  
**Dernière mise à jour** : Décembre 2024  
**Auteur** : Serge (RTN)
