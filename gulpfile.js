var gulp = require('gulp'),
  connect = require('gulp-connect');

//Webサーバー
gulp.task('connect', function() {
  connect.server({
    root: 'app',//ルートディレクトリ
    livereload: true, //ライブリロード
    port: 5000
  });
});

//'html'に、htmlファイルをリロードする処理を登録
gulp.task('html', function () {
  gulp.src('./app/*.html')
    .pipe(connect.reload());
});

//'js'に、jsファイルをリロードする処理を登録
gulp.task('js', function () {
  gulp.src('./app/*.js')
    .pipe(connect.reload());
});

//監視：HTMLファイルが変更されたら'html'を実行
gulp.task('watch', function () {
  gulp.watch(['./app/*.html'], ['html']);
  gulp.watch(['./app/*.js'], ['js']);

});

//デフォルトタスクに登録
gulp.task('default', ['connect', 'watch']);