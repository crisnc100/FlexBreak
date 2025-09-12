#!/bin/bash
# Get the Windows host IP from WSL
export REACT_NATIVE_PACKAGER_HOSTNAME=$(cat /etc/resolv.conf | grep nameserver | awk '{print $2}')
echo "Using IP: $REACT_NATIVE_PACKAGER_HOSTNAME"
npx expo start --clear --host lan
