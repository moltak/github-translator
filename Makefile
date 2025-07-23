# Variables
NODE_MODULES = node_modules
DIST = dist

# Default target
all: install build

# Install dependencies
install: $(NODE_MODULES)

$(NODE_MODULES): package.json
	npm install
	touch $(NODE_MODULES)

# Build the project
build: clean
	@mkdir -p dist/js
	@mkdir -p dist/popup
	npm run build && \
	cp manifest.json dist/ && \
	cp -r src/images dist/ && \
	cp src/popup/hello.html dist/popup/

# Clean the build artifacts
clean:
	rm -rf $(DIST)

.PHONY: all install build clean
