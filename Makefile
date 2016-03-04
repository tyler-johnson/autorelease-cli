BIN = ./node_modules/.bin
SRC = $(wildcard src/* src/*/*)

build: index.js

index.js: src/index.js $(SRC)
	echo "#!/usr/bin/env node" > $@
	$(BIN)/rollup $< -c -f cjs >> $@

clean:
	rm -f index.js

.PHONY: build clean
