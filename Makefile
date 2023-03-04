NAME=LinkedInJobsFilterer
FILES=content-script.js manifest.json options.html options.js \
	icons/16.png icons/48.png icons/128.png \
	$(wildcard key.pem)

dist/$(NAME).zip: $(FILES)
	mkdir -p dist
	rm -f $@.tmp
	zip -r $@.tmp $(FILES)
	mv -f $@.tmp $@

clean:
	rm -rf dist
