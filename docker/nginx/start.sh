#!/bin/sh
set -eu
# Accept an origin only: no credentials, path, query, or Nginx directives.
if ! printf '%s' "$API_UPSTREAM" | grep -Eq '^https?://[a-zA-Z0-9][a-zA-Z0-9._-]*(:[0-9]{1,5})?$'; then
    echo 'Invalid API_UPSTREAM: expected http(s)://hostname[:port]' >&2
    exit 2
fi
envsubst '${API_UPSTREAM}' < /opt/redgreen/default.conf.template > /tmp/redgreen-server.conf
nginx -t
exec nginx -g 'daemon off;'
