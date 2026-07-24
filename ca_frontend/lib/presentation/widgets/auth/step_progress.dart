import 'package:flutter/material.dart';

import '../../../core/theme/adaptive_colors.dart';

/// Barra de progresso visual para fluxos multi-etapas (wizard).
class StepProgress extends StatelessWidget {
  const StepProgress({
    super.key,
    required this.currentStep,
    required this.totalSteps,
    required this.labels,
  }) : assert(labels.length == totalSteps);

  final int currentStep;
  final int totalSteps;
  final List<String> labels;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Row(
          children: List.generate(totalSteps, (index) {
            final isActive = index <= currentStep;
            final isLast = index == totalSteps - 1;

            return Expanded(
              child: Row(
                children: [
                  _StepDot(
                    stepNumber: index + 1,
                    isActive: isActive,
                    isCurrent: index == currentStep,
                  ),
                  if (!isLast)
                    Expanded(
                      child: Container(
                        height: 2,
                        margin: const EdgeInsets.symmetric(horizontal: 4),
                        decoration: BoxDecoration(
                          color: index < currentStep
                              ? context.appBrand
                              : context.appBorder,
                          borderRadius: BorderRadius.circular(1),
                        ),
                      ),
                    ),
                ],
              ),
            );
          }),
        ),
        const SizedBox(height: 10),
        Row(
          children: List.generate(labels.length, (index) {
            final isActive = index <= currentStep;
            return Expanded(
              child: Text(
                labels[index],
                textAlign: index == 0
                    ? TextAlign.start
                    : index == labels.length - 1
                        ? TextAlign.end
                        : TextAlign.center,
                style: TextStyle(
                  color: isActive
                      ? context.appTextPrimary
                      : context.appTextSecondary,
                  fontSize: 11,
                  fontWeight: index == currentStep
                      ? FontWeight.bold
                      : FontWeight.normal,
                ),
              ),
            );
          }),
        ),
      ],
    );
  }
}

class _StepDot extends StatelessWidget {
  const _StepDot({
    required this.stepNumber,
    required this.isActive,
    required this.isCurrent,
  });

  final int stepNumber;
  final bool isActive;
  final bool isCurrent;

  @override
  Widget build(BuildContext context) {
    return AnimatedContainer(
      duration: const Duration(milliseconds: 250),
      width: 28,
      height: 28,
      decoration: BoxDecoration(
        shape: BoxShape.circle,
        color: isActive ? context.appBrand : context.appPanel,
        border: isCurrent
            ? Border.all(color: context.appTextPrimary, width: 2)
            : !isActive
                ? Border.all(color: context.appBorder)
                : null,
        boxShadow: isCurrent
            ? [
                BoxShadow(
                  color: context.appBrand.withValues(alpha: 0.4),
                  blurRadius: 8,
                  spreadRadius: 1,
                ),
              ]
            : null,
      ),
      child: Center(
        child: Text(
          '$stepNumber',
          style: TextStyle(
            color: isActive ? context.appOnBrand : context.appMuted,
            fontSize: 12,
            fontWeight: FontWeight.bold,
          ),
        ),
      ),
    );
  }
}
