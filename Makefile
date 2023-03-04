NAME=LinkedInJobsFilterer
FILES=content-script.js manifest.json options.html options.js \
	$(wildcard key.pem)

dist/$(NAME).zip: $(FILES)
	mkdir -p dist
	rm -f $@.tmp
	zip -r $@.tmp $(FILES)
	mv -f $@.tmp $@

clean:
	rm -rf dist
