#!/bin/bash
sed -i '' '/.card-body p {/a\
  display: -webkit-box;\
  -webkit-line-clamp: 3;\
  -webkit-box-orient: vertical;\
  overflow: hidden;
' public/css/activity.css
