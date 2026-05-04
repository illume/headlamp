# Helm values template for OAuth2-Proxy. `run.sh` substitutes the
# placeholders and writes the result to `oauth2-proxy-values.yaml`.
#
# Placeholders:
#   __COOKIE_SECRET__  - 32-byte base64url cookie secret
#   __DEX_ISSUER__     - issuer URL of Dex (must match the `issuer:` field
#                        of dex-config.yaml so that the `iss` claim is
#                        validated correctly)

config:
  clientID: "headlamp"
  clientSecret: "headlamp-oauth2-proxy-secret"
  cookieSecret: "__COOKIE_SECRET__"
  configFile: |-
    email_domains = ["*"]
    provider = "oidc"
    oidc_issuer_url = "__DEX_ISSUER__"
    redirect_url = "http://localhost:8080/oauth2/callback"

    # Insecure values are fine for this local-only demo; do NOT use them
    # in production.
    cookie_secure = false
    insecure_oidc_allow_unverified_email = true
    ssl_insecure_skip_verify = true

    scope = "openid profile email groups"

    # Forward the user's OIDC id_token to Headlamp as
    # `Authorization: Bearer <id_token>`. With provider = "oidc",
    # `pass_authorization_header` forwards the id_token (not the access
    # token) to the upstream — which is what Headlamp expects by default.
    # Headlamp can be switched to access-token mode via
    # `-oidc-use-access-token` (HEADLAMP_CONFIG_OIDC_USE_ACCESS_TOKEN);
    # if you do that, swap this for `pass_access_token = true` and have
    # Headlamp read X-Forwarded-Access-Token instead.
    pass_authorization_header = true

    # Where authenticated requests are forwarded.
    upstreams = ["http://headlamp.headlamp.svc.cluster.local:80"]

    http_address = "0.0.0.0:4180"
    reverse_proxy = true

service:
  type: ClusterIP
  portNumber: 80

# Don't auto-create an Ingress; we use `kubectl port-forward` for the demo.
ingress:
  enabled: false
