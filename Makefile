.PHONY: doc gen-schema all cleanup check-deps clean_build
SHELL := /bin/bash

doc:
	rm -rf docs
	rm -rf book/docs
	# Used for building all files
	npx typedoc --options typedoc.json
	python postprocess_docs.py
	cp -r docs book/docs

check-deps:
	@for package in $$(ls packages/ | grep -v 'staking-cli'); do \
		npm exec --workspace=packages/$$package -- npx npm-check -i '@chorus-one/*' ; \
	done

gen-schema:
	curl -s "https://raw.githubusercontent.com/cosmos/chain-registry/master/chain.schema.json" > chain.schema.json
	curl -s "https://raw.githubusercontent.com/cosmos/chain-registry/master/assetlist.schema.json" > assetlist.schema.json
	npx --package=json-schema-to-typescript json2ts chain.schema.json > packages/cosmos/src/registry/chain.d.ts
	npx --package=json-schema-to-typescript json2ts assetlist.schema.json > packages/cosmos/src/registry/assetlist.d.ts

cleanup:
	npm run cleanup

clean_build: 
	rm -rf packages/*/dist
	rm -rf packages/*/.turbo
	rm -rf .turbo

all: doc gen-schema cleanup
