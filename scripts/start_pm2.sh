#!/bin/bash
sudo su
nvm use 16
cd /home/ec2-user/workspace/reelmail-backend/
# Assuming your application entry point is `app.js`
pm2 restart 0