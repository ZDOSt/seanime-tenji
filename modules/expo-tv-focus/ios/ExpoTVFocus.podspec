Pod::Spec.new do |s|
  s.name           = 'ExpoTVFocus'
  s.version        = '0.1.0'
  s.summary        = 'Android-style spatial focus for tvOS'
  s.description    = 'Applies Android FocusFinder rules to native tvOS focus guides'
  s.author         = 'seanime'
  s.homepage       = 'https://github.com/5rahim/seanime'
  s.platforms      = {
    :ios => '15.1',
    :tvos => '15.1'
  }
  s.source         = { git: '' }
  s.static_framework = true

  s.dependency 'ExpoModulesCore'

  s.pod_target_xcconfig = {
    'DEFINES_MODULE' => 'YES',
  }

  s.source_files = "**/*.{h,m,mm,swift,hpp,cpp}"
end
