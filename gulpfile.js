var gulp = require('gulp'),
    spawn = require('child_process').spawn,
    node;

var source = require('vinyl-source-stream'); // Used to stream bundle for further handling
var browserify = require('browserify');
var watchify = require('watchify');
var reactify = require('reactify');
var concat = require('gulp-concat');

gulp.task('start-server', function() {
    if (node) node.kill()
    node = spawn('node', ['src/server/index.js'], {stdio: 'inherit'})
    node.on('close', function (code) {
        if (code === 8) {
            gulp.log('Error detected, waiting for changes...');
        }
    });
});

gulp.task('server', function() {
    gulp.run('start-server');
    gulp.watch(['./src/server/*.js'], ['server']);
});

process.on('exit', function() {
    if (node) node.kill()
});


gulp.task('browserify', function() {

    return browserify({
        //do your config here
        entries: './src/client/client.js',
        transform: [reactify]
    })
        .bundle()
        .pipe(source('bundle.js'))
        .pipe(gulp.dest('build'));
});

gulp.task('watchify', function() {
    var bundler = browserify({
        entries: ['./src/client/client.js'], // Only need initial file, browserify finds the deps
        transform: [reactify], // We want to convert JSX to normal javascript
        debug: true, // Gives us sourcemapping
        cache: {}, packageCache: {}, fullPaths: true // Requirement of watchify
    });
    var watcher  = watchify(bundler);

    return watcher
        .on('update', function () { // When any files update
            var updateStart = Date.now();
            console.log('Updating!');
            watcher.bundle() // Create new bundle that uses the cache for high performance
                .pipe(source('bundle.js'))
                .pipe(gulp.dest('build'));
            console.log('Updated!', (Date.now() - updateStart) + 'ms');
        }).
        on('log', function(msg) {
            console.log('log: ' + msg);
        })
        .bundle() // Create the initial bundle when starting the task
        .pipe(source('bundle.js'))
        .pipe(gulp.dest('build'));
});

// I added this so that you see how to run two watch tasks
gulp.task('css', function () {
    gulp.watch('styles/**/*.css', function () {
        return gulp.src('styles/**/*.css')
            .pipe(concat('main.css'))
            .pipe(gulp.dest('build/'));
    });
});

// Just running the two tasks
gulp.task('default', ['watchify', 'server']);
