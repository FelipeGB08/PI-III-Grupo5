import 'package:flutter/widgets.dart';
import 'package:google_sign_in_web/web_only.dart' as google_web;

Widget buildGoogleWebSignInButton() {
  return google_web.renderButton(
    configuration: google_web.GSIButtonConfiguration(
      minimumWidth: 280,
      size: google_web.GSIButtonSize.large,
      text: google_web.GSIButtonText.continueWith,
    ),
  );
}
