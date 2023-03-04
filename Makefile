NAME=LinkedInJobsFilterer
#
# The first time this extension was uploaded to the Chrome Web Store the
# private key was included in it but it doesn't need to be after that and I
# don't want to keep it in the source tree both because it's a security issue
# and Chrome complains about unpacked extensions with private key files in
# their directories.
#
#PRIVATE_KEY=key.pem
FILES=content-script.js manifest.json options.html options.js \
	icons/16.png icons/48.png icons/128.png $(PRIVATE_KEY)

all: $(NAME).zip

$(NAME).zip: $(foreach f,$(FILES),build/$(f))
	rm -f build/$@.tmp
	cd build && zip -r $@.tmp $(FILES)
	mv -f build/$@.tmp $@

build/manifest.json: manifest.json
	@mkdir -p build
	rm -f $@.tmp
	grep -v '"key"' $< > $@.tmp
	mv $@.tmp $@

build/%: %
	@mkdir -p $(dir $@)
	cp $< $@

clean:
	rm -rf $(NAME).zip build
