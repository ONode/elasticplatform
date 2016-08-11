# -*- encoding: utf-8 -*-
lib = File.expand_path('../lib', __FILE__)
$LOAD_PATH.unshift(lib) unless $LOAD_PATH.include?(lib)
require 'pdftk-heroku/version'

Gem::Specification.new do |gem|
  gem.name          = "pdftk-heroku"
  gem.version       = Pdftk::Heroku::VERSION
  gem.authors       = ["Charlie Maffitt", "Robert Rawlins", "Daniel Rice"]
  gem.email         = %q{cmaffitt@bignerdranch.com, robrawlins@gmail.com, daniel.rice@ldstudios.co}
  gem.description   = %q{pdftk binary for Heroku}
  gem.summary       = %q{pdftk binary for Heroku, meant for use on the Cedar14 stack}
  gem.homepage      = %q{https://github.com/ChromeCapital/pdftk-heroku}
  gem.date          = Time.now
  gem.licenses      = ["MIT"]

  gem.files         = `git ls-files`.split($/)
  gem.executables   = gem.files.grep(%r{^bin/}).map{ |f| File.basename(f) }
  gem.test_files    = gem.files.grep(%r{^(test|spec|features)/})
  gem.require_paths = ["lib"]
end