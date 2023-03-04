NAME=LinkedInJobsFilterer
FILES=content-script.js manifest.json options.html options.js \
	icons/16.png icons/48.png icons/128.png \
	$(wildcard key.pem)

all: dist/$(NAME).zip unpacked

dist/$(NAME).zip: $(FILES)
	@mkdir -p dist
	rm -f $@.tmp
	zip -r $@.tmp $(FILES)
	mv -f $@.tmp $@

unpacked: $(foreach f,$(FILES),local/$(f))

local/manifest.json: manifest.json pubkey.json
	@mkdir -p local
	rm -f $@.tmp
	jq -s '.[0] * .[1]' $^ > $@.tmp
	mv $@.tmp $@

local/%: %
	@mkdir -p $(dir $@)
	cp $< $@

pubkey.json: key.pub
	rm -f $@.tmp
	echo '{"key": "$(shell grep -v '^-' key.pub | tr -d '\n')"}' > $@.tmp
	mv -f $@.tmp $@

clean:
	rm -rf dist local pubkey.json
