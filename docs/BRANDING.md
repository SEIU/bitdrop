# Functional Changes

The script `deploy.sh` is used to deploy this system.  It should suffice to
get the system up-and-running on any system exposed to the outside world on
ports 3000 and 8443.  Typically those will not be the final ports, but a proxy
server will generally rename ports or DNS entries, and will provide signed TLS
certificates.

In the first few lines of the `deploy.sh` script, we define several environment
variables.  `BITDROP_SERVER` and `VITE_BITDROP_SERVER` define the URLs used to
access the FastAPI/Gunicorn backend and that will be used in email sent from
the server.  These must be changed to reflect your deployment (or you may
choose to deploy by other mechanisms than this script).

# Visual Changes

The variables `VITE_ORG_NAME` and `VITE_APP_NAME` in `deploy.sh` control
display elements used in the website UI.  You may not use the name "SEIU" for
`VITE_ORG_NAME` in your external deployment.  You are free to use the name
"BitDrop" for `VITE_APP_NAME` but are also free to rename your deployment to a
different name custom to your implementation.

In the directory `frontend/src/branding/` are two assets, `app-logo.svg` and
`theme.js`.  The logo is a rendering of the name "SEIU" and you must
substitute something different in identifying your implementation.  The file
`theme.js` defines a few visual stylistic elements.  These are not per-se
restricted, but the "SEIU purple" color used in the banner is strongly
identified with SEIU branding across assets and systems.  We would appreciate
if you vary from that specific color element in your branding.

The file `frontend/public/favicon.ico` is the icon used by the SEIU
deployment.  It is simply the letter "B" rendered in purple and in a font
similar to those used by other SEIU assets.  You may use this icon if you
wish, but especially if you use a different name for you deployment, the "B"
may be less descriptive.  You may also wish to change the icon color to
harmonize with other color elements you choose within `theme.js`.
