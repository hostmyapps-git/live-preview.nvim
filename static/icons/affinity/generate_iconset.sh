#!/usr/bin/env bash
# usage: ./make_icons.sh [color] [form]
# Beispiel: ./make_icons.sh blue circle
# ohne Argumente: alle Farben und alle Formen

FILTER_COLOR="$1"
FILTER_FORM="$2"

echo '{'
echo '  "prefix": "affinity",'
echo '  "icons": {'

first=1
for form in circle square naked; do
  # Formfilter aktiv?
  if [ -n "$FILTER_FORM" ] && [ "$FILTER_FORM" != "$form" ]; then
    continue
  fi

  if [ -d "$form" ]; then
    if [ "$form" = "naked" ]; then
      # keine Farb-Unterverzeichnisse
      for file in "$form"/*.svg; do
        [ -e "$file" ] || continue
        name=$(basename "$file" .svg)
        key="${form}_${name}"

        # Präfixe entfernen
        key="${key#naked_}"
        key="${key#square_}"
        key="${key#circle_}"

        svg=$(tr -d '\n' < "$file" | sed 's/"/\\"/g')
        if [ $first -eq 0 ]; then
          echo ','
        fi
        echo -n "    \"$key\": { \"body\": \"$svg\" }"
        first=0
      done
    else
      # mit Farb-Unterverzeichnissen
      for color in "$form"/*; do
        [ -d "$color" ] || continue
        cname=$(basename "$color")

        # Farbfilter aktiv?
        if [ -n "$FILTER_COLOR" ] && [ "$FILTER_COLOR" != "$cname" ]; then
          continue
        fi

        for file in "$color"/*.svg; do
          [ -e "$file" ] || continue
          name=$(basename "$file" .svg)
          key="${form}_${cname}_${name}"

          # Wenn ein Filter gesetzt ist, diesen aus dem Key entfernen
          if [ -n "$FILTER_COLOR" ]; then
            key="${key//_${FILTER_COLOR}/}"
          fi

          # Präfixe entfernen
          key="${key#naked_}"
          key="${key#square_}"
          key="${key#circle_}"

          svg=$(tr -d '\n' < "$file" | sed 's/"/\\"/g')
          if [ $first -eq 0 ]; then
            echo ','
          fi
          echo -n "    \"$key\": { \"body\": \"$svg\" }"
          first=0
        done
      done
    fi
  fi
done

echo
echo '  }'
echo '}'
