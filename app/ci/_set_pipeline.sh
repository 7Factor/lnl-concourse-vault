#!/bin/sh

fly -t local sp -c ./pipeline.yml -p main
