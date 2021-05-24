# Linking Vault and Concourse
This repo demonstrates how to link a Concourse instance to a Vault instance.

## What?
[Concourse](https://concourse-ci.org/) is the tool that 7Factor uses for Continuous Integration and Continuous Deployment. You write code with tests, your code gets merged, Concourse runs the tests and makes sure that nothing has been broken before automatically deploying your code to a staging environment. Super cool.

[Vault](https://www.vaultproject.io/) is a database that's really hard to read data from. Its purpose is to be a single secure place to store secrets for your software - API keys, credentials, anything you shouldn't be committing in your source code lives in Vault.

All the projects we build run in Docker. We use Concourse to test our code, build our docker images and then handle deploying them to our environments. Secrets are read from Vault and passed in to the Docker images at build time.

## Requirements
You need the following thing installed:
- [Docker Engine](https://docs.docker.com/engine/install/#server) (for `docker-compose`)

## This Repo
This repo shows you how to run Concourse and Vault locally and walks you through building a Docker image using secrets from Vault.

### 0. Fork this repo

If you complete steps 1 to 7 you will learn how to create a build process that pulls secrets from Vault which is the point of this exercise so that's a legitimate place to stop. The steps beyond that will go a bit more in-depth with accessing secrets and will teach you a bit more about Concourse, but you'll need to fork this repo as you'll be pushing commits. 

### 1. Bring the services up

Run `docker-compose up` from the root directory.

Once that's complete, you should be able to visit the following URLs:

- Vault: [http://localhost:8200](http://localhost:8200)
- Concourse: [http://127.0.0.1:8080](http://127.0.0.1:8080)
- Docker Registry: [http://localhost:5000](http://localhost:5000)

### 2. Log in to Vault

Visit Vault and your first question will likely be "how do I log in". Normally you would [generate a root token](https://learn.hashicorp.com/tutorials/vault/generate-root) but for this example we're just going to set one through an environment variable.

Go to `/doocker-compose.yml` and update the `vault:` service with the following:

```yaml
environment:
  - VAULT_ADDR=http://0.0.0.0:8200
  - VAULT_DEV_ROOT_TOKEN_ID=root_token
```

`environment` is on the same level as `ports:`, `networks:` etc.

Our Vault server is running in Dev mode. This means we are able to pass in a root token as it has lowered it security standards for ease of testing. It also defaults to the url `127.0.0.1:8200` which will cause us problems with Docker.

- `VAULT_ADDR` is set to fix a networking problem that I can't remember the exact details of but you need it and this isn't a Docker tutorial. I think the URL being set to 127.0.0.0 prevents external access while 0.0.0.0 doesn't.
- `VAULT_DEV_ROOT_TOKEN_ID` sets the root token that we'll be using to log in with.

Great! Run `docker-compose up` again, services will rebuild and now you should be able to log in to Vault with `root_token`.

### 3. Set up a Secrets Engine for Concourse

In Vault you'll see two Secrets Engines: `cubbyhole/` and `secret/`. Concourse needs to have a Secrets Engine set up for itself and by default it expects it to be named `concourse/` so let's set that up.

Vault has two key-value Secrets Engines, v1 and v2. v2 gives you a version history for secrets so you can see what was changed and easily roll back changes if a secret was changed unnecessarily. Unfortunately Concourse does not work with v2 right now so we use v1. v1 allows you to set and delete things at will and does not provide a mechanism for undoing changes.

To set up a Secrets Engine we need to shell in to the Vault docker image.

In your CLI run:

```shell
docker container list
```

and copy the name or the ID of the container from the image `vault`.

Now run 
```shell
docker exec -it NAME_OR_ID sh
```

*hacker voice*: we're in

First we need to log in to Vault with our root token:

```shell
vault login
```

Now we need to create the secrets engine:

```shell
vault secrets enable -path=concourse -version=1 kv
```

Vault defaults to v1 for the kv engine but it never hurts to be explicit.

Refresh the Vault page and you should now see a `concourse/` secrets engine!

### 4. Telling Concourse about Vault

We have a home for our Concourse secrets now, so we need to tell Concourse that it should look there.

Head back to `docker-compose.yml` and find the `concourse:` service - not `concourse-db:`.

Add the following environment variables:

```dotenv
CONCOURSE_VAULT_URL=http://vault:8200
CONCOURSE_VAULT_CLIENT_TOKEN=root_token
```

- `CONCOURSE_VAULT_URL` is pretty self-explanatory. The domain is `vault` because we're relying on Docker's own internal service resolution and it allows us to direct traffic to any given service just by using the service name. Look closer and you'll see each service has a `network` configuration. By default Docker gives each service its own network which means they can't talk to each other, so we add them all to the same network.
- `CONCOURSE_VAULT_CLIENT_TOKEN` is how we give Concourse the required credentials to access Vault in **the least secure way possible**. Don't actually do this for anything important.

Concourse's website has documentation on how to [authenticate with vault](https://concourse-ci.org/vault-credential-manager.html#authenticating-with-vault) properly if you want to know more.

Run
```shell
docker-compose up
```
again and Concourse should be good to go.

### 5. Set up `fly`
I won't go too deep into Concourse - if you're totally unfamiliar with it then have a look at [https://concoursetutorial.com/](https://concoursetutorial.com/) but you should still be able to follow along.

Visit your local Concourse instance ([http://127.0.0.1:8080](http://127.0.0.1:8080)) and log in with the username and password `admin`. 

You may need to install the CLI tool `fly`. If so, in the bottom right corner you'll see `version: v6.6.0 cli:` and some icons. Click the icon for your OS.

In this fresh Concourse install you can see that there are no pipelines. We need to add one to build our app, so go back to the command line and let's add our Concourse install as a target.

```shell
fly --target=local login --team-name=main --concourse-url=http://127.0.0.1:8080
```

- `target=local` is us naming the Concourse install 'local'.
- `team-name` is the name of the team we're using in Concourse. `main` is the default team and you can add more using `fly`.

Run

```shell
fly targets
```

and you should see something like

```shell
name       url                        team          expiry                       
local      http://127.0.0.1:8080      main          Sat, 20 Mar 2021 16:09:03 UTC
```

Now we're ready to give Concourse instructions!

### 6. Create a pipeline

To establish a test/build/deploy flow for any given project you create a pipeline. These are defined using yaml, and ours is located in `app/ci/pipeline.yml`. More about pipelines [here](https://concoursetutorial.com/basics/basic-pipeline/).

To apply this pipeline run the following command:

```shell
fly --target=local set-pipeline --config=./app/ci/pipeline.yml --pipeline=tfl
```

- `target=local` here we're telling fly which Concourse server to use
- `config=path` path to a yaml file telling Concourse what to do
- `pipeline=tfl` here we're giving our pipeline a name. This can be anything you want. 

`fly` will show you the changes that are going to be made and ask you to approve them. Apply the configuration.

Go back to Concourse and you'll see a paused pipeline called `tfl` has appeared.

Click the little play button at the bottom and the pipeline will attempt to run but will just sit on "pending".

Click the `tfl` header above the big rectangle and then click `tfl-app` on the left.

You should see the error `undefined vars: tfl.git_uri`.

If you look in `pipeline.yml` you'll see the following on line six:

```yaml
      uri: ((tfl.git_uri))
```

This is Concourse trying to read a secret from Vault, but the secret doesn't exist. Let's fix that.

### 7. Adding a secret to Vault

Head back to Vault and click on the `concourse/` secrets engine and then click `Create secret`.

The path that we set is very important. This is dictated by how our Concourse pipeline is configured. Concourse has a section on [credential lookup rules](https://concourse-ci.org/vault-credential-manager.html#vault-credential-lookup-rules) but the bit we care about is this:

> When you have a parameter like ((foo)) in a pipeline definition, Concourse will (by default) look for it in the following paths, in order:
> 
>    `/concourse/TEAM_NAME/PIPELINE_NAME/foo`

1. We have `/concourse/` sorted as that's the name of the Secret Engine
2. In step 5 we established that we're using the default team name `main`
3. In step 6 we created a pipeline with the name `tfl`
4. `pipeline.yml` is looking for a secret called `tfl.git_uri`

So we set the Path as `main/tfl`, we set the key as `git_uri` and the value as the URL for this git repo!

Fill that in, hit save, then go back to the tfl-app error page in Concourse.

Wait for a minute, or hit the refresh icon on the top left, and you should see it successfully find the git repo! This will be indicated by a bar with a white tick and a commit hash.

Click `tfl` in the menu at the top of the page and you should be taken to the pipeline view where you'll see the `build-docker-image` rectangle doing something exciting.

## Note
If you have not forked the repo, stop here. The following steps involve pushing commits which would break the tutorial for the next person.

If you want to continue all you need to do is fork the repo, update the `git_uri` secret and change the git remote:

`git remote set-url origin <url of forked repo>`

### 8. Run the app

Go to http://localhost:5000 and you should see a UI for the Docker Registry we're running locally. If the `build-docker-image` task has not finished yet this will be empty, but once that's completed you'll see a line appear with the name `tfl-app`. 

Switch back to your CLI and run the following:

```shell
docker run -p 3000:3000 localhost:5000/tfl-app
```

Docker will pull the image and run it at http://localhost:3000. Visit it and you should see a page that says "Could not retrieve status information".

This is because we haven't passed the app an API key to hit the TfL API with!

### 9. Add the API key to the app

Visit [https://api-portal.tfl.gov.uk/](https://api-portal.tfl.gov.uk/), create an account and grab an API key from the Profile page.

Go back to Vault and in `concourse/main/tfl` click **Edit secret**.

Add the key `TFL_API_KEY` with your API key as the value then click Save.

Now that the key is in Vault we need to add it to Docker. We're going to do this by adding it as an build-time environment variable in `pipeline.yml` and then modify the Dockerfile to save the build env var into the actual built image.

In `pipeline.yml` add the following to the `docker-registry:` block:

```yaml
      build_args:
        TFL_API_KEY: ((tfl.tfl_api_key))
```

The result looks like this:

```yaml
  - name: docker-registry
    type: docker-image
    source:
      repository: docker-registry:5000/tfl-app
      insecure_registries:
        - http://docker-registry:5000
      build_args:
        TFL_API_KEY: ((tfl.tfl_api_key))
```

Now add the following to `app/Dockerfile` just after the EXPOSE line:

```dockerfile
ARG TFL_API_KEY
ENV TFL_API_KEY=$TFL_API_KEY
```

`ARG` reads in the build argument, `ENV` sets it as an environment variable in the final built image.

### 10. Push, Rebuild and Rerun

Now that we're set up for passing in the API key, commit the changes and push them to your forked repo.

Concourse will detect the new commit and rebuild the image.

We'll now need to 

1. Stop the running image:
   Run `docker ps` and grab the CONTAINER ID of the image `localhost:5000/tfl-app`
   Run `docker stop <id>` and wait for it to stop
2. Update the image from our local repo:
   `docker pull localhost:5000/tfl-app`
3. Run it again:
    `docker run -p 3000:3000 localhost:5000/tfl-app`
   
Visit http://localhost:3000/ again and you should be greeted with a fully functioning Transport for London Tube status page!

### Cleanup

When you are done marvelling at coloured lines and Good Service, follow the above steps again to kill the running container and run `docker-compose down` to halt the other running services. 
