module.exports = {
  source: './src',
  destination: './docs',
  excludes: ['constants/'],
  plugins: [
    { name: 'esdoc-standard-plugin' },
    { name: 'esdoc-ecmascript-proposal-plugin', option: { all: true } }
  ]
}
