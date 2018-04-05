/* eslint-env node */

module.exports = function(grunt) {
  // Load all NPM tasks
  require('load-grunt-tasks')(grunt);
  grunt.initConfig();

  grunt.registerTask('default',
    'Build, Lint and test the webextension.',
    ['build', 'lint', 'test']
  );

  grunt.registerTask('build',
    'Build the webextension.',
    ['clean', 'webpack:build', 'shell:webextBuild']
  );

  grunt.registerTask('build:beta',
    'Build the webextension as a self-hosted beta (including selfupdate_url).',
    ['clean', 'webpack:build', 'patch-manifest', 'shell:webextBuild']
  );

  grunt.registerTask('run',
    'Run the webextension with Firefox, watching and rebuilding when ' +
    'files change.',
    ['clean', 'webpack:build', 'concurrent:run']
  );

  grunt.registerTask('lint',
    'Check for linter warnings.',
    ['eslint', 'shell:webextLint']
  );

  grunt.registerTask('test',
    'Run the unit tests.',
    ['karma:unit']
  );

  grunt.registerTask('test:watch',
    'Run the unit tests, watching and rerunning when files change.',
    ['karma:watch']
  );

  grunt.registerTask('sign',
    'Build and sign a beta webextension.',
    ['build:beta', 'shell:webextSign']
  );

  grunt.registerTask('patch-manifest',
    'Add update_url to build/manifest.json',
    require('./grunt/patch-manifest')
  );

  grunt.config('clean', require('./grunt/clean'));
  grunt.config('shell', require('./grunt/shell'));
  grunt.config('webpack', require('./grunt/webpack'));
  grunt.config('eslint', require('./grunt/eslint'));
  grunt.config('karma', require('./grunt/karma'));

  grunt.config('concurrent', {
    // Run webpack in watch mode alongside webext run
    run: {
      tasks: ['webpack:watch', 'shell:webextRun'],
      options: {
        logConcurrentOutput: true,
      },
    },
  });
};
