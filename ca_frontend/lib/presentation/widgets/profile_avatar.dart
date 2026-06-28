import 'dart:typed_data';

import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';

import '../../core/config/api_config.dart';
import '../../core/theme/app_colors.dart';

class ProfileAvatar extends StatelessWidget {
  const ProfileAvatar({
    super.key,
    required this.name,
    this.imageUrl,
    this.previewBytes,
    this.radius = 32,
    this.onEdit,
    this.isOnline = false,
    this.showEdit = false,
  });

  final String name;
  final String? imageUrl;
  final Uint8List? previewBytes;
  final double radius;
  final VoidCallback? onEdit;
  final bool isOnline;
  final bool showEdit;

  @override
  Widget build(BuildContext context) {
    final size = radius * 2;
    final resolvedUrl = ApiConfig.resolveAssetUrl(imageUrl);

    Widget content;
    if (previewBytes != null) {
      content = Image.memory(
        previewBytes!,
        width: size,
        height: size,
        fit: BoxFit.cover,
      );
    } else if (resolvedUrl.isNotEmpty) {
      content = CachedNetworkImage(
        imageUrl: resolvedUrl,
        width: size,
        height: size,
        fit: BoxFit.cover,
        placeholder: (_, __) => const Center(
          child: SizedBox(
            width: 18,
            height: 18,
            child: CircularProgressIndicator(strokeWidth: 2),
          ),
        ),
        errorWidget: (_, __, ___) => _Initials(name: name, radius: radius),
      );
    } else {
      content = _Initials(name: name, radius: radius);
    }

    return Stack(
      clipBehavior: Clip.none,
      children: [
        Container(
          width: size,
          height: size,
          decoration: BoxDecoration(
            shape: BoxShape.circle,
            gradient: AppColors.amaucGradient,
            boxShadow: [
              BoxShadow(
                color: AppColors.primary.withValues(alpha: 0.22),
                blurRadius: 22,
                offset: const Offset(0, 10),
              ),
            ],
          ),
          padding: const EdgeInsets.all(2),
          child: ClipOval(
            child: DecoratedBox(
              decoration: const BoxDecoration(color: AppColors.darkPanel),
              child: content,
            ),
          ),
        ),
        if (isOnline)
          Positioned(
            right: 2,
            bottom: 2,
            child: Container(
              width: radius * 0.42,
              height: radius * 0.42,
              decoration: BoxDecoration(
                color: AppColors.accent,
                shape: BoxShape.circle,
                border: Border.all(color: AppColors.darkBackground, width: 3),
              ),
            ),
          ),
        if (showEdit)
          Positioned(
            right: -2,
            bottom: -2,
            child: Material(
              color: AppColors.primary,
              shape: const CircleBorder(),
              child: InkWell(
                customBorder: const CircleBorder(),
                onTap: onEdit,
                child: Padding(
                  padding: EdgeInsets.all(radius >= 44 ? 10 : 7),
                  child: Icon(
                    Icons.photo_camera_rounded,
                    color: Colors.white,
                    size: radius >= 44 ? 20 : 16,
                  ),
                ),
              ),
            ),
          ),
      ],
    );
  }
}

class _Initials extends StatelessWidget {
  const _Initials({required this.name, required this.radius});

  final String name;
  final double radius;

  @override
  Widget build(BuildContext context) {
    return Container(
      alignment: Alignment.center,
      color: AppColors.primary.withValues(alpha: 0.12),
      child: Text(
        _initials(name),
        style: TextStyle(
          color: AppColors.primary,
          fontSize: radius * 0.52,
          fontWeight: FontWeight.w900,
        ),
      ),
    );
  }

  String _initials(String value) {
    final parts = value
        .trim()
        .split(RegExp(r'\s+'))
        .where((part) => part.isNotEmpty)
        .toList();
    if (parts.isEmpty) return '?';
    if (parts.length == 1) return parts.first[0].toUpperCase();
    return '${parts.first[0]}${parts.last[0]}'.toUpperCase();
  }
}
