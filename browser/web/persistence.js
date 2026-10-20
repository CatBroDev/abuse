/* Browser storage for original Abuse save slots and settings. No save-state
 * shortcut: the game still creates saves at its original save stations. */
(() => {
  const root = '/home/web_user/.abuse';
  Module.storageState = 'loading';
  const status = value => {
    Module.storageState = value;
    Module.onStorageState?.(value);
    const el = document.querySelector('#storage');
    if (el) el.textContent = value === 'available'
      ? 'Save at an in-game station. Saved slots stay in this browser.'
      : value === 'unavailable' ? 'Browser storage unavailable. Saves last only for this visit.'
      : value === 'saving' ? 'Saving to this browser…' : 'Loading saved slots…';
  };
  Module.preRun ??= [];
  Module.preRun.push(() => {
    const {FS, IDBFS} = Module;
    FS.mkdirTree(root);
    // A fixed mount path means updates to the versioned runtime URL do not
    // silently create a new save database. Preview and production have separate origins.
    FS.mount(IDBFS, {autoPersist: true}, root);
    const queue = IDBFS.queuePersist;
    IDBFS.queuePersist = mount => { status('saving'); queue(mount); };
    const sync = IDBFS.syncfs;
    IDBFS.syncfs = (mount, populate, done) => {
      if (!populate) status('saving');
      sync(mount, populate, error => {
        done(error);
        status(error ? 'unavailable' : mount.idbPersistState ? 'saving' : 'available');
      });
    };
    Module.addRunDependency('abuse-saves');
    FS.syncfs(true, error => {
      if (error) status('unavailable');
      if (!FS.analyzePath(root + '/gamma.lsp').exists)
        FS.writeFile(root + '/gamma.lsp', '(setq darkest_gray 16)\n');
      Module.removeRunDependency('abuse-saves');
    });
  });
})();
