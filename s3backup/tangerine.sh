aws s3 sync /var/lib/couchdb/1.2.0  s3://tangerine-couch --exclude="deleted*" > tangerine_backup.log 2>&1 &
