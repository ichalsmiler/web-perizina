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

## 7. Exposing it beyond your LAN (optional)

By default the app listens on port 3000 on the Ubuntu host. To serve it over HTTPS
with a real domain, put it behind a reverse proxy such as Nginx or Caddy and obtain
a certificate (e.g. via Let's Encrypt / certbot). This is optional and independent
of the steps above — the app itself has no built-in HTTPS.

## 8. Moving from SQLite to PostgreSQL (recommended for real production use)

The prototype uses SQLite for simplicity. For heavier concurrent use, switch
`web/prisma/schema.prisma`'s datasource `provider` to `"postgresql"`, point
`DATABASE_URL` in `web/.env` at a Postgres instance, then run
`npx prisma migrate deploy` again from `web/`.
