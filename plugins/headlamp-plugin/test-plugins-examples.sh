#!/bin/sh
# A humble test of the plugins/examples

set -e
set -o xtrace

npm run check-dependencies
npm run build
npm run copy-package-lock
npm pack

cd ../examples
for i in * ; do
  if [ -d "$i" ]; then
    cd "$i"
    # Test changes to headlamp-plugin in the PR/repo that released version might not have.
    # Note: npm ci cannot be used here because it ignores positional package arguments —
    # "npm ci <tgz>" silently installs from the lockfile (registry version) instead of the local tarball.
    npm install `ls -t ../../headlamp-plugin/kinvolk-headlamp-plugin-*.tgz | head -1`
    npm run lint
    npm run format
    npm run build
    npm run tsc
    cd ..
  fi
done

