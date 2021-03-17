# Vault Concourse Demo

Vault: http://localhost:8200
Concourse: http://127.0.0.1:8080
Docker Registry: http://localhost:5000
TFL App: http://localhost:3000

## TfL API

Line Status Endpoint:

https://api-portal.tfl.gov.uk/api-details#api=Line&operation=Line_StatusByModeByPathModesQueryDetailQuerySeverityLevel


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
