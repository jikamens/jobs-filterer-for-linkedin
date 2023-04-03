NAME=LinkedInJobsFilterer
#
# The first time this extension was uploaded to the Chrome Web Store the
# private key was included in it but it doesn't need to be after that and I
# don't want to keep it in the source tree both because it's a security issue
# and Chrome complains about unpacked extensions with private key files in
# their directories.
#
#PRIVATE_KEY=key.pem
GEN_JS_FILES=$(patsubst %.in,%,$(wildcard *.js.in)) button.js
TEST_FILES=$(GEN_JS_FILES) \
	$(filter-out utils.js button.js $(GEN_JS_FILES),$(wildcard *.js)) \
	$(wildcard *.html) manifest.json options.html \
	icons/16.png icons/48.png icons/128.png $(PRIVATE_KEY)
SHIP_FILES=$(filter-out tests.js,$(TEST_FILES))
ESLINT=node_modules/.bin/eslint

all: $(GEN_JS_FILES) $(NAME).zip $(NAME)-test.zip

$(NAME).zip: $(foreach f,$(SHIP_FILES),build/$(f))
	@if grep 'utils\.debugging.*true' $(SHIP_FILES); then \
	    echo "Can't ship with debugging enabled" 1>&2; false; \
	else true; fi
	rm -f build/$@.tmp
	cd build && zip -r $@.tmp $(SHIP_FILES)
	mv -f build/$@.tmp $@

$(NAME).crx: $(foreach f,$(SHIP_FILES),build/$(f))
	@if grep 'utils\.debugging.*true' $(SHIP_FILES); then \
	    echo "Can't ship with debugging enabled" 1>&2; false; \
	else true; fi
	rm -f firefox/$@.tmp
	cd firefox && zip -r $@.tmp $(SHIP_FILES)
	mv -f firefox/$@.tmp $@

$(NAME)-test.zip: $(foreach f,$(TEST_FILES),build/$(f))
	rm -f build/$@.tmp
	cd build && zip -r $@.tmp $(TEST_FILES)
	mv -f build/$@.tmp $@

build/manifest.json: manifest.json
	@mkdir -p build
	rm -f $@.tmp
	grep -v '"key"' $< > $@.tmp
	mv $@.tmp $@

build/%: %
	@mkdir -p $(dir $@)
	cp -f $< $@

lint: $(ESLINT) $(GEN_JS_FILES)
	$(ESLINT) .
	flake8 run-tests.py

test: test-config.yml $(NAME)-test.zip
	./run-tests.py $(TEST_ARGS)

$(ESLINT):
	npm install

clean:
	rm -rf *.zip *.crx build $(GEN_JS_FILES)

# "Why isn't utils.js a JavaScript module that's imported into the other files
# that need its functions?" you ask? Because when it is, then whenever the
# extension is updated in a running Chrome instance, utils.js starts failing
# to import with the error "Failed to fetch dynamically imported module." I
# spent hours banging my head against this trying to figure out what's causing
# it and how to fix it and eventually gave up. The path of least resistence is
# to just embed a copy of the code in all the files that need it.
%.js: %.js.in utils.js
	rm -f $@ $@.tmp
	cp /dev/null $@.tmp
	echo "// Included from utils.js" >> $@.tmp
	cat utils.js >> $@.tmp
	echo "// Original $@.in" >> $@.tmp
	cat $@.in >> $@.tmp
	chmod a-w $@.tmp
	mv $@.tmp $@

content-script.js: content-script.js.in utils.js button.js
	rm -f $@ $@.tmp
	cp /dev/null $@.tmp
	echo "// Included from utils.js" >> $@.tmp
	cat utils.js >> $@.tmp
	echo "// Included from button.js" >> $@.tmp
	cat button.js >> $@.tmp
	echo "// Original $@.in" >> $@.tmp
	cat $@.in >> $@.tmp
	chmod a-w $@.tmp
	mv $@.tmp $@

button.js: icons/16.png
	rm -f $@ $@.tmp
	echo "var buttonIconURL = 'data:image/png;base64,$$(base64 < $< | tr -d '\n')';" > $@.tmp
	chmod a-w $@.tmp
	mv $@.tmp $@

.NOTINTERMEDIATE: $(GEN_JS_FILES)
