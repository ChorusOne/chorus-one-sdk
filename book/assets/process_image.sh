#!/bin/bash

# Check if the input argument is provided
if [ "$#" -ne 1 ]; then
  echo "Usage: $0 <filename>"
  exit 1
fi

# Original filename from input
original="$1"
# Backup filename
backup="${original%.*}.backup.${original##*.}"

# Create a backup of the original file
cp "$original" "$backup"

# Process the image and save it as the original file
convert "$original" -resize 450x450 \
        -background transparent -gravity center -extent 1020x574 "$original"
