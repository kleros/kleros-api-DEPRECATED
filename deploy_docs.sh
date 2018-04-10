# Remove old docs dir
rm -rf docs || exit 0;
# Build docs
yarn run docs;

# Set up new directory
mkdir ../esdocs;
cp -r docs/* ../esdocs/;

# github pages. must be run by user with ssh write access to kleros-api
cd ../esdocs;
git init;
git add .;
git commit -m "Deploy to GitHub Pages";
git push --force --quiet "git@github.com:kleros/kleros-api.git" master:gh-pages;

# cleanup
rm -rf ../esdocs;
