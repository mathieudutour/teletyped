include node_modules/@mathieudutour/js-fatigue/Makefile

build-example: build
	$(BIN_DIR)/babel example/src --out-dir example/build && \
	$(BIN_DIR)/webpack example/build/app.js example/app.bundle.js -d
