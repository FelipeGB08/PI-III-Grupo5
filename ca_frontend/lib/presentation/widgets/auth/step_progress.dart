import 'package:flutter/material.dart';

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

  static const Color _activeColor = Color(0xFF3B82F6);
  static const Color _inactiveColor = Color(0xFF334155);

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
                              ? _activeColor
                              : _inactiveColor,
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
                  color: isActive ? Colors.white : Colors.white38,
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
        color:
            isActive ? StepProgress._activeColor : StepProgress._inactiveColor,
        border: isCurrent
            ? Border.all(color: Colors.white.withValues(alpha: 0.5), width: 2)
            : null,
        boxShadow: isCurrent
            ? [
                BoxShadow(
                  color: StepProgress._activeColor.withValues(alpha: 0.4),
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
            color: isActive ? Colors.white : Colors.white54,
            fontSize: 12,
            fontWeight: FontWeight.bold,
          ),
        ),
      ),
    );
  }
}
