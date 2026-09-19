# Deploy IzinSiswa to Ubuntu (Proxmox VM/LXC)

This installs the app as a native Node.js systemd service — no Docker required.
Tested against Ubuntu 22.04/24.04.

## 1. Prepare the Ubuntu machine

Any Proxmox VM or LXC container running Ubuntu with network access works.
For an LXC container, an **unprivileged** container is fine (no Docker/nesting needed).

Make sure you can SSH into it:

```bash
ssh youruser@<ubuntu-ip>
```

## 2. Give the Ubuntu machine access to the private GitHub repo

Since the repo is private, generate a read-only **deploy key** on the Ubuntu machine
and add it to the GitHub repo (Settings → Deploy keys):

```bash
ssh-keygen -t ed25519 -C "izinsiswa-deploy" -f ~/.ssh/izinsiswa_deploy -N ""
cat ~/.ssh/izinsiswa_deploy.pub
```

Copy the printed public key into GitHub: **Repo → Settings → Deploy keys → Add deploy key**
(read-only is enough). Then tell SSH to use this key for GitHub:

```bash
cat >> ~/.ssh/config <<'EOF'
Host github.com
  IdentityFile ~/.ssh/izinsiswa_deploy
  IdentitiesOnly yes
EOF
```

## 3. Clone and install

```bash
git clone git@github.com:<your-username>/izinsiswa.git
cd izinsiswa
sudo bash deploy/install-ubuntu.sh
```

The script (`deploy/install-ubuntu.sh`) will:
1. Install Node.js 22.x, git, and build tools if missing.
2. Create a dedicated `izinsiswa` system user to run the service.
3. Generate `web/.env` with a random `JWT_SECRET` (only if `.env` doesn't already exist).
4. Install dependencies, run database migrations, and seed a default admin account.
5. Build the production bundle.
6. Install and start `izinsiswa.service` via systemd (auto-restarts on crash/boot).

When it finishes, it prints the URL (e.g. `http://192.168.x.x:3000`) and the default
admin login (**change the password after first login** — see below).

## 4. Updating after code changes

```bash
cd izinsiswa
git pull
sudo bash deploy/install-ubuntu.sh
```

Re-running the script is safe: it reuses the existing `.env`, re-applies any new
migrations, reseeds (idempotent — won't duplicate data), rebuilds, and restarts the service.

## 5. Useful commands

```bash
sudo systemctl status izinsiswa      # is it running?
sudo systemctl restart izinsiswa     # restart after manual changes
sudo journalctl -u izinsiswa -f      # live logs
```

## 6. Data & backups

Two things hold real data and live **outside** git (see `web/.gitignore`):

- `web/prisma/dev.db` — the SQLite database.
- `web/storage/` — uploaded documents and selfies.

Back these up regularly, e.g.:

```bash
tar -czf izinsiswa-backup-$(date +%F).tar.gz -C /opt izinsiswa/web/prisma/dev.db izinsiswa/web/storage
```

(Adjust the path if you cloned somewhere other than `/opt/izinsiswa`.)

## 7. HTTP on the school LAN and optional HTTPS

### Current deployment: HTTP only

HTTPS has been disabled at the administrator's request. Use:

- Parents: `http://172.16.32.209:3000`
- Admin: `http://172.16.32.209:3000/admin/login`

`izinsiswa.service` runs Next.js with an explicit bind address:

```ini
ExecStart=/usr/bin/node /opt/izinsiswa/web/node_modules/.bin/next start -H 0.0.0.0
```

Nginx is stopped and disabled at boot. The IzinSiswa Nginx site and local TLS
certificate have been removed; ports 80 and 443 are not serving the app.
The existing `setup-https.sh` remains available but must only be run when HTTPS
is explicitly wanted again. No database or uploaded files need to change when
switching protocols.

HTTP does not encrypt passwords, session cookies, or uploaded student/parent
data. Restrict this deployment to a trusted LAN; do not expose it to the public
internet. Include `http://` and `:3000` in the address when opening the app.

Browsers block the embedded live camera (`getUserMedia`) over LAN HTTP. The form
instead immediately shows **Unggah Foto Selfie / Orang Tua**. Select a verification
photo, complete the required fields, and tick the declaration before submitting.
A phone may offer its camera through the file picker; that depends on the browser
and is not the embedded live camera. The verification-photo upload and submission
flow have been tested through HTTP.

Verification:

```bash
curl --fail --max-time 10 -o /dev/null -w '%{http_code}\n' http://172.16.32.209:3000/
sudo systemctl is-active izinsiswa   # active
sudo systemctl is-active nginx      # inactive (non-zero status is expected)
sudo systemctl is-enabled nginx     # disabled (non-zero status is expected)
sudo ss -ltnp                       # app on 0.0.0.0:3000; no listener on 80/443
```

### Optional: enable HTTPS again

Browsers only expose the embedded camera (`getUserMedia`) in a **secure context**,
normally trusted HTTPS or localhost. Granting camera permission alone does not
make a plain LAN HTTP page a secure context.

For a school LAN with no public domain, the bundled script installs Nginx
as a TLS reverse proxy with a self-signed certificate and binds the app to
localhost so HTTPS cannot be bypassed:

```bash
sudo bash setup-https.sh
# if the LAN IP is not auto-detected:
SERVER_IP=172.16.32.209 sudo -E bash setup-https.sh
```

Afterwards:

- `https://<server-ip>` — parents
- `https://<server-ip>/admin/login` — admin
- `http://<server-ip>` redirects to HTTPS automatically
- port 3000 is no longer reachable from the network (Nginx proxies to it)

A self-signed certificate is not automatically trusted by phones. Certificate
warnings may recur, and bypassing a warning does not guarantee camera access in
every browser. For reliable use, configure a local CA trusted by each device or
use a publicly trusted certificate for a domain. Verify `window.isSecureContext`
and camera access on the actual phone; a test browser ignoring certificate
errors is not proof that parents' devices will trust the certificate.

The script is idempotent — re-running it reuses a valid certificate and only
regenerates one when it expires or the server IP changes.

With a real public domain, use Let's Encrypt / certbot instead of the
self-signed certificate.

## 8. Moving from SQLite to PostgreSQL (recommended for real production use)

The prototype uses SQLite for simplicity. For heavier concurrent use, switch
`web/prisma/schema.prisma`'s datasource `provider` to `"postgresql"`, point
`DATABASE_URL` in `web/.env` at a Postgres instance, then run
`npx prisma migrate deploy` again from `web/`.
