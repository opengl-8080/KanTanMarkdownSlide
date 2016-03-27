# かんたんMarkdownSlide
[かんたんMarkdown](https://github.com/tatesuke/KanTanMarkdown) から派生した、スライド作成用の簡易エディタです。

[とりあえず試す](https://opengl-8080.github.io/KanTanMarkdownSlide/ktm-std.html)

# かんたんMarkdownとの違い
プレビューを、 [Remark](https://github.com/gnab/remark) を使ってスライドで表示するようになっています。  
それ以外は、基本的にかんたんMarkdownと同じ動作をします。

ただし、若干違うところもあります。

## 本家との違い
- シーケンス図・フローチャート図が表示できない
  - 今のところ、これらの機能は正しく動作しません。
  - 単純に移植したところ、図の定義が記載されたページを表示した後でシーケンス図化などをしないとうまく表示できないようです。
- IE で表示が崩れる
  - Remark 単独で動かしても同じ現象が起こったので、たぶん Remark 側のバグっぽいです。
  - 可能なら、 Chrome を使ってください（速度的にも Chrome が推奨です）。
- Lite エディションはない。
  - Remark が HighlightJS を使ってるので、自然と Lite はありません。
  - 上のシーケンス図が動かない話と合わせると、必然的に Standard エディションのみが利用できるエディションになります。

## 使い方
表示がプレビューになったこと以外は、基本的にかんたんMarkdownと一緒なので、本家の使い方を参照してください。

http://tatesuke.github.io/KanTanMarkdown/

## 本家がバージョンアップしたときの後追いについて
余裕があれば対応しますが、迅速な対応はできない可能性が高いです。

## リリースノート
### v1.20160327.01
* リリース
