#!/bin/bash

cd ./backup
find . -name "*.*~" | xargs rm
zip -r ../backupMail.xpi ./*

