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

    # Forward the user's id_token to Headlamp as a Bearer token, so
    # Headlamp can call the Kubernetes API server on the user's behalf.
    pass_authorization_header = true
    pass_access_token = true
    set_authorization_header = true
    set_xauthrequest = true

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
