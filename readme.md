# Vault Concourse Demo

# To Do

- [x] Get vault and concourse running
- [x] Connect vault and concourse
- [x] Create a pipeline for the app
- [x] Push the app to a local docker registry
- [ ] Have it pass a secret in to the app

Vault: http://localhost:8200
Concourse: http://127.0.0.1:8080
Docker Registry: http://localhost:5000
TFL App: http://localhost:3000

## TfL API

Line Status

https://api-portal.tfl.gov.uk/api-details#api=Line&operation=Line_StatusByModeByPathModesQueryDetailQuerySeverityLevel

`https://api.tfl.gov.uk/Line/Mode/tube,dlr/Status?app_key=`

# Notes

Launch Vault
Launch Concourse

## How do we link them?
concourse docker compose

    - CONCOURSE_VAULT_URL=http://localhost:8200
    - CONCOURSE_VAULT_CLIENT_TOKEN=root_token

Terminal into Vault box

`vault login` -> root_token
`vault secrets enable -version=1 -path=concourse kv`

go to vault UI
create a policy called `concourse`
```hcl
path "concourse/*" {
  policy = "read"
}
```

# Concourse
target: local, team name: main

`fly -t local login -n main -c http://127.0.0.1:8080`

Set pipeline

`./app/ci/_set_pipeline.sh`

# Finally run the app

```shell
docker pull localhost:5000/tfl-app
docker run -p 3000:3000 localhost:5000/tfl-app
```

# Secrets???
Secrets are found at
/concourse/TEAM_NAME/PIPELINE_NAME/foo

TEAM_NAME is main
PIPELINE_NAME is tfl
