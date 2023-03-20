Start a postgres database with
docker run -it --rm -e POSTGRES_PASSWORD=YOUR_PASSWORD_HERE -p 5432:5432 --name pg -v pgdata:/var/lib/postgresql/data postgres


The export services uses Azure B2C, using the customer flow. It's wired into the DTA and the ATO at present, and users will use their real identities/ ABNs, as verified by the ATO to log in. There are plans to support microsofts AD (active directory) as an auth mechanism.

Our export services auth relies on JWT tokens. The basic model is that to make an authed API request, you need to supply a Bearer Token JWT with it. This will identify the user on whose behalf that API call is being sent.

To get started, you'll need a client secret and client secret.

JWTS:

https://docs.microsoft.com/en-us/azure/active-directory/develop/security-tokens?bc=%2Fazure%2Factive-directory-b2c%2Fbread%2Ftoc.json&toc=%2Fazure%2Factive-directory-b2c%2FTOC.json#json-web-tokens-and-claims

Flow used:

https://docs.microsoft.com/en-us/azure/active-directory/develop/v2-oauth2-auth-code-flow
