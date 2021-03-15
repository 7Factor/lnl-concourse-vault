#!/bin/sh

fly -t local sp -c ./app/ci/pipeline.yml -p main
