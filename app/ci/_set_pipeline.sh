#!/bin/sh

#fly -t local sp -c ./app/ci/pipeline.yml -p tfl

fly --target=local set-pipeline --config=./app/ci/pipeline.yml --pipeline=tfl
