# Deploy IzinSiswa to Ubuntu (Proxmox VM/LXC)

The whole install lives in one file, `install.sh` at the repo root. It runs the
app as a native Node.js systemd service (no Docker). Tested against Ubuntu 22.04/24.04,
on a Proxmox VM or an unprivileged LXC container.

## 1. Fresh server

Copy `install.sh` to the server (nothing else is needed; the repo is public and the
script clones it), then run:

```bash
sudo bash install.sh
```

Or without copying anything:

```bash
curl -fsSL https://raw.githubusercontent.com/ichalsmiler/web-perizina/main/install.sh | sudo bash
```

The script:
1. Installs curl, git, build tools, and Node.js 22.x if missing.
2. Creates the `izinsiswa` system user and clones the repo to `/opt/izinsiswa`.
3. Writes `web/.env` with a random `JWT_SECRET` (only if it doesn't exist).
4. Asks for the admin username and password in the terminal. Leave the password
   empty to have one generated; it is printed once in the "Seed admin" output.
5. Installs dependencies, applies migrations, seeds the admin, and builds.
6. Writes and starts `/etc/systemd/system/izinsiswa.service`, then waits for HTTP 200.

To skip the prompt, pass the credentials as environment variables:

```bash
sudo ADMIN_USERNAME=smada ADMIN_PASSWORD='your-strong-password' bash install.sh
```

## 2. Updating

Run the same script again; it detects the existing install:

```bash
sudo bash /opt/izinsiswa/install.sh
```

On update it:
- backs up `web/prisma/dev.db`, `web/storage/`, and `web/.env` to
  `/var/backups/izinsiswa/` (the last 10 are kept);
- pulls the latest `main` from GitHub (fast-forward only);
- keeps `.env`, the admin password, and the service's bind address
  (`127.0.0.1` after `setup-https.sh`, otherwise `0.0.0.0`);
- re-runs migrations, seed, and build, then restarts the service.

If tracked code files were edited by hand on the server, the update stops and lists
them. `sudo FORCE_RESET=1 bash /opt/izinsiswa/install.sh` discards those edits;
the database, `.env`, and uploads are untracked and never touched.

Other options (environment variables): `ADMIN_PASSWORD` to change the admin
password during an update, `INSTALL_DIR`, `BRANCH`, `PORT`, `BIND_HOST`.

## 3. Useful commands

```bash
sudo systemctl status izinsiswa      # is it running?
sudo systemctl restart izinsiswa     # restart after manual changes
sudo journalctl -u izinsiswa -f      # live logs
```

## 4. Data & backups

Two things hold real data and live **outside** git (see `web/.gitignore`):

- `web/prisma/dev.db` — the SQLite database.
- `web/storage/` — uploaded documents and selfies.

Back these up regularly, e.g.:

```bash
tar -czf izinsiswa-backup-$(date +%F).tar.gz -C /opt izinsiswa/web/prisma/dev.db izinsiswa/web/storage
```

(Adjust the path if you cloned somewhere other than `/opt/izinsiswa`.)

## 5. HTTP on the school LAN and optional HTTPS

### Current deployment: HTTP only

HTTPS has been disabled at the administrator's request. Use:

- Parents: `http://172.16.32.209:3000`
- Admin: `http://172.16.32.209:3000/admin/login`

`izinsiswa.service` runs Next.js with an explicit bind address:

```ini
ExecStart=/usr/bin/node /opt/izinsiswa/web/node_modules/.bin/next start -H 0.0.0.0 -p 3000
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
instead immediately shows **Ambil foto dengan aplikasi kamera HP** with an
**Ambil foto wajah** button. Take or select a verification photo, complete the required fields, and tick the declaration before submitting.
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

## 6. Moving from SQLite to PostgreSQL (recommended for real production use)

The prototype uses SQLite for simplicity. For heavier concurrent use, switch
`web/prisma/schema.prisma`'s datasource `provider` to `"postgresql"`, point
`DATABASE_URL` in `web/.env` at a Postgres instance, then run
`npx prisma migrate deploy` again from `web/`.
