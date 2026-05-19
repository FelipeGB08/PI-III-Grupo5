import 'package:flutter/material.dart';

void main() {
  runApp(const CasaAzulApp());
}

class CasaAzulApp extends StatelessWidget {
  const CasaAzulApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      debugShowCheckedModeBanner: false,
      title: 'Casa Azul',
      theme: ThemeData(
        useMaterial3: true,
        brightness: Brightness.dark,
        scaffoldBackgroundColor: AppColors.background,
        colorScheme: ColorScheme.fromSeed(
          seedColor: AppColors.cyan,
          brightness: Brightness.dark,
          surface: AppColors.card,
        ),
        fontFamily: 'Roboto',
      ),
      home: const MainShell(),
    );
  }
}

class AppColors {
  static const Color background = Color(0xFF050505);
  static const Color card = Color(0xFF141414);
  static const Color cardLight = Color(0xFF1D1D1D);
  static const Color cyan = Color(0xFF08D7FF);
  static const Color cyanDark = Color(0xFF0099B8);
  static const Color textPrimary = Color(0xFFF2F2F2);
  static const Color textSecondary = Color(0xFFB7B7B7);
  static const Color muted = Color(0xFF777777);
}

class MainShell extends StatefulWidget {
  const MainShell({super.key});

  @override
  State<MainShell> createState() => _MainShellState();
}

class _MainShellState extends State<MainShell> {
  int _selectedIndex = 0;

  final List<Widget> _pages = const [
    HomePage(),
    CategoriesPage(),
    ProfessionalPage(),
    ContactProfessionalPage(),
  ];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        child: IndexedStack(
          index: _selectedIndex,
          children: _pages,
        ),
      ),
      bottomNavigationBar: Container(
        margin: const EdgeInsets.fromLTRB(18, 0, 18, 14),
        decoration: BoxDecoration(
          color: AppColors.card,
          borderRadius: BorderRadius.circular(26),
          border: Border.all(color: Colors.white.withOpacity(0.06)),
          boxShadow: [
            BoxShadow(
              color: AppColors.cyan.withOpacity(0.12),
              blurRadius: 18,
              offset: const Offset(0, 8),
            ),
          ],
        ),
        child: ClipRRect(
          borderRadius: BorderRadius.circular(26),
          child: BottomNavigationBar(
            currentIndex: _selectedIndex,
            onTap: (index) => setState(() => _selectedIndex = index),
            backgroundColor: Colors.transparent,
            elevation: 0,
            type: BottomNavigationBarType.fixed,
            selectedItemColor: AppColors.cyan,
            unselectedItemColor: AppColors.muted,
            selectedFontSize: 11,
            unselectedFontSize: 10,
            items: const [
              BottomNavigationBarItem(
                icon: Icon(Icons.person_outline),
                activeIcon: Icon(Icons.person),
                label: 'Perfil',
              ),
              BottomNavigationBarItem(
                icon: Icon(Icons.grid_view_outlined),
                activeIcon: Icon(Icons.grid_view_rounded),
                label: 'Serviços',
              ),
              BottomNavigationBarItem(
                icon: Icon(Icons.engineering_outlined),
                activeIcon: Icon(Icons.engineering),
                label: 'Profissional',
              ),
              BottomNavigationBarItem(
                icon: Icon(Icons.calendar_month_outlined),
                activeIcon: Icon(Icons.calendar_month),
                label: 'Contato',
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class AppPage extends StatelessWidget {
  const AppPage({
    required this.children,
    this.horizontalPadding = 22,
    super.key,
  });

  final List<Widget> children;
  final double horizontalPadding;

  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(
      builder: (context, constraints) {
        return Center(
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 430),
            child: SingleChildScrollView(
              padding: EdgeInsets.fromLTRB(horizontalPadding, 18, horizontalPadding, 26),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: children,
              ),
            ),
          ),
        );
      },
    );
  }
}

class HomePage extends StatelessWidget {
  const HomePage({super.key});

  @override
  Widget build(BuildContext context) {
    return AppPage(
      children: [
        const AppHeader(
          eyebrow: 'Bem-vindo de volta',
          title: 'Casa Azul',
          subtitle: 'Organize seus reparos residenciais com praticidade.',
        ),
        const SizedBox(height: 22),
        SectionCard(
          title: 'Olá',
          children: const [
            SettingsTile(icon: Icons.person_outline, label: 'Informações Pessoais'),
            SettingsTile(icon: Icons.home_outlined, label: 'Endereço Salvo'),
            SettingsTile(icon: Icons.history, label: 'Histórico de Agendamentos'),
          ],
        ),
        const SizedBox(height: 14),
        SectionCard(
          title: 'Preferências',
          children: const [
            SettingsTile(icon: Icons.notifications_none, label: 'Notificações de push'),
            SettingsTile(icon: Icons.privacy_tip_outlined, label: 'Permissão de localização'),
            SettingsTile(icon: Icons.lock_outline, label: 'Privacidade e segurança'),
          ],
        ),
        const SizedBox(height: 14),
        SectionCard(
          title: 'Suporte',
          children: const [
            SettingsTile(icon: Icons.help_outline, label: 'Central de Ajuda'),
            SettingsTile(icon: Icons.support_agent, label: 'Falar com Atendimento'),
          ],
        ),
        const SizedBox(height: 18),
        const PrimaryButton(label: 'Sair'),
      ],
    );
  }
}

class CategoriesPage extends StatelessWidget {
  const CategoriesPage({super.key});

  @override
  Widget build(BuildContext context) {
    const services = [
      ServiceItem(icon: Icons.water_drop_outlined, title: 'Encanador'),
      ServiceItem(icon: Icons.electrical_services_outlined, title: 'Eletricista'),
      ServiceItem(icon: Icons.format_paint_outlined, title: 'Pintor'),
      ServiceItem(icon: Icons.chair_outlined, title: 'Marceneiro'),
      ServiceItem(icon: Icons.cleaning_services_outlined, title: 'Limpeza'),
      ServiceItem(icon: Icons.roofing_outlined, title: 'Telhados'),
    ];

    return AppPage(
      children: [
        const SizedBox(height: 10),
        Text(
          'Navegar por Categorias',
          style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                color: AppColors.textPrimary,
                fontWeight: FontWeight.w800,
              ),
        ),
        const SizedBox(height: 14),
        const SearchPanel(),
        const SizedBox(height: 22),
        Text(
          'Tudo para sua casa',
          style: Theme.of(context).textTheme.titleMedium?.copyWith(
                color: AppColors.textPrimary,
                fontWeight: FontWeight.w700,
              ),
        ),
        const SizedBox(height: 14),
        GridView.builder(
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          itemCount: services.length,
          gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
            crossAxisCount: 2,
            mainAxisSpacing: 16,
            crossAxisSpacing: 16,
            childAspectRatio: 1.08,
          ),
          itemBuilder: (context, index) => services[index],
        ),
      ],
    );
  }
}

class ProfessionalPage extends StatelessWidget {
  const ProfessionalPage({super.key});

  @override
  Widget build(BuildContext context) {
    return AppPage(
      children: [
        const AppHeader(
          eyebrow: 'Profissional em destaque',
          title: 'Beltrano de Tal',
          subtitle: 'Especialista em pequenos reparos, elétrica e manutenção preventiva.',
        ),
        const SizedBox(height: 20),
        Text(
          'Trabalhos anteriores',
          style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w700),
        ),
        const SizedBox(height: 12),
        const WorkGallery(),
        const SizedBox(height: 22),
        Text(
          'Avaliações da Comunidade',
          style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w700),
        ),
        const SizedBox(height: 12),
        const ReviewCard(
          name: 'Ciclano de Tal',
          text: 'Muito atencioso, pontual e cuidadoso nos detalhes do reparo.',
        ),
        const SizedBox(height: 12),
        const ReviewCard(
          name: 'Beltrana de Tal',
          text: 'Fez o atendimento rapidamente, explicou o serviço e deixou tudo limpo.',
        ),
        const SizedBox(height: 20),
        const PrimaryButton(label: 'Agendar'),
      ],
    );
  }
}

class ContactProfessionalPage extends StatelessWidget {
  const ContactProfessionalPage({super.key});

  @override
  Widget build(BuildContext context) {
    return AppPage(
      children: [
        const SizedBox(height: 6),
        Row(
          children: [
            IconButton.filled(
              style: IconButton.styleFrom(backgroundColor: AppColors.cardLight),
              onPressed: () {},
              icon: const Icon(Icons.arrow_back_ios_new_rounded, size: 16),
            ),
            const SizedBox(width: 8),
            Text(
              'Contratar Profissional',
              style: Theme.of(context).textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w800),
            ),
          ],
        ),
        const SizedBox(height: 20),
        const ProfessionalSummary(),
        const SizedBox(height: 22),
        const LabeledInput(label: 'Nome completo', hint: 'Informe seu nome'),
        const SizedBox(height: 14),
        const LabeledInput(label: 'Endereço do serviço', hint: 'Rua, número, bairro'),
        const SizedBox(height: 14),
        const LabeledInput(label: 'Serviço solicitado', hint: 'Ex.: reparo elétrico'),
        const SizedBox(height: 14),
        const LabeledInput(label: 'Data e horário', hint: 'Selecione uma opção'),
        const SizedBox(height: 14),
        const LabeledInput(
          label: 'Mensagem para o profissional',
          hint: 'Descreva brevemente o problema',
          maxLines: 4,
        ),
        const SizedBox(height: 22),
        const PrimaryButton(label: 'Enviar solicitação'),
      ],
    );
  }
}

class AppHeader extends StatelessWidget {
  const AppHeader({
    required this.eyebrow,
    required this.title,
    required this.subtitle,
    super.key,
  });

  final String eyebrow;
  final String title;
  final String subtitle;

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Container(
          width: 58,
          height: 58,
          decoration: BoxDecoration(
            color: AppColors.cardLight,
            borderRadius: BorderRadius.circular(18),
            border: Border.all(color: AppColors.cyan.withOpacity(0.35)),
          ),
          child: const Icon(Icons.home_repair_service_outlined, color: AppColors.cyan, size: 30),
        ),
        const SizedBox(height: 10),
        Text(
          eyebrow,
          textAlign: TextAlign.center,
          style: Theme.of(context).textTheme.labelMedium?.copyWith(
                color: AppColors.cyan,
                fontWeight: FontWeight.w700,
              ),
        ),
        Text(
          title,
          textAlign: TextAlign.center,
          style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                color: AppColors.textPrimary,
                fontWeight: FontWeight.w900,
              ),
        ),
        const SizedBox(height: 6),
        Text(
          subtitle,
          textAlign: TextAlign.center,
          style: Theme.of(context).textTheme.bodySmall?.copyWith(color: AppColors.textSecondary, height: 1.35),
        ),
      ],
    );
  }
}

class SectionCard extends StatelessWidget {
  const SectionCard({required this.title, required this.children, super.key});

  final String title;
  final List<Widget> children;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: AppColors.card,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: Colors.white.withOpacity(0.05)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            title,
            style: Theme.of(context).textTheme.labelLarge?.copyWith(
                  color: AppColors.textSecondary,
                  fontWeight: FontWeight.w700,
                ),
          ),
          const SizedBox(height: 10),
          ...children,
        ],
      ),
    );
  }
}

class SettingsTile extends StatelessWidget {
  const SettingsTile({required this.icon, required this.label, super.key});

  final IconData icon;
  final String label;

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(bottom: 9),
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 10),
      decoration: BoxDecoration(
        color: AppColors.background,
        borderRadius: BorderRadius.circular(12),
      ),
      child: Row(
        children: [
          CircleAvatar(
            radius: 15,
            backgroundColor: Colors.white.withOpacity(0.14),
            child: Icon(icon, size: 16, color: AppColors.textPrimary),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Text(
              label,
              style: Theme.of(context).textTheme.bodySmall?.copyWith(
                    color: AppColors.textPrimary,
                    fontWeight: FontWeight.w600,
                  ),
            ),
          ),
          const Icon(Icons.arrow_forward_ios_rounded, size: 12, color: AppColors.textSecondary),
        ],
      ),
    );
  }
}

class PrimaryButton extends StatelessWidget {
  const PrimaryButton({required this.label, super.key});

  final String label;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      height: 44,
      child: ElevatedButton(
        onPressed: () {},
        style: ElevatedButton.styleFrom(
          backgroundColor: AppColors.cyan,
          foregroundColor: Colors.black,
          elevation: 0,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(15)),
        ),
        child: Text(label, style: const TextStyle(fontWeight: FontWeight.w800)),
      ),
    );
  }
}

class SearchPanel extends StatelessWidget {
  const SearchPanel({super.key});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: AppColors.card,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: AppColors.cyan.withOpacity(0.16)),
      ),
      child: Column(
        children: [
          Container(
            height: 42,
            padding: const EdgeInsets.symmetric(horizontal: 14),
            decoration: BoxDecoration(
              color: AppColors.background,
              borderRadius: BorderRadius.circular(18),
            ),
            child: const Row(
              children: [
                Icon(Icons.search, color: AppColors.cyan, size: 20),
                SizedBox(width: 10),
                Expanded(
                  child: Text(
                    'Buscar por serviço...',
                    style: TextStyle(color: AppColors.textSecondary, fontSize: 13),
                  ),
                ),
                CircleAvatar(radius: 7, backgroundColor: AppColors.cyan),
              ],
            ),
          ),
          const SizedBox(height: 12),
          const Row(
            children: [
              FilterChipLabel(label: 'Todos'),
              FilterChipLabel(label: 'Perto de você'),
              FilterChipLabel(label: 'Melhor nota'),
            ],
          ),
        ],
      ),
    );
  }
}

class FilterChipLabel extends StatelessWidget {
  const FilterChipLabel({required this.label, super.key});

  final String label;

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: Container(
        height: 26,
        margin: const EdgeInsets.symmetric(horizontal: 3),
        alignment: Alignment.center,
        decoration: BoxDecoration(
          color: AppColors.cyan,
          borderRadius: BorderRadius.circular(30),
        ),
        child: Text(
          label,
          overflow: TextOverflow.ellipsis,
          style: const TextStyle(color: Colors.black, fontSize: 10, fontWeight: FontWeight.w800),
        ),
      ),
    );
  }
}

class ServiceItem extends StatelessWidget {
  const ServiceItem({required this.icon, required this.title, super.key});

  final IconData icon;
  final String title;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: AppColors.card,
        borderRadius: BorderRadius.circular(22),
        border: Border.all(color: Colors.white.withOpacity(0.05)),
      ),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Container(
            width: 46,
            height: 46,
            decoration: const BoxDecoration(
              color: AppColors.cyan,
              shape: BoxShape.circle,
            ),
            child: Icon(icon, color: Colors.black, size: 24),
          ),
          const SizedBox(height: 12),
          Text(
            title,
            textAlign: TextAlign.center,
            style: Theme.of(context).textTheme.bodySmall?.copyWith(
                  color: AppColors.textPrimary,
                  fontWeight: FontWeight.w700,
                ),
          ),
        ],
      ),
    );
  }
}

class WorkGallery extends StatelessWidget {
  const WorkGallery({super.key});

  @override
  Widget build(BuildContext context) {
    return GridView.count(
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      crossAxisCount: 2,
      mainAxisSpacing: 12,
      crossAxisSpacing: 12,
      childAspectRatio: 1,
      children: const [
        WorkTile(icon: Icons.shower_outlined, label: 'Banheiro'),
        WorkTile(icon: Icons.door_front_door_outlined, label: 'Porta'),
        WorkTile(icon: Icons.water_damage_outlined, label: 'Filtro'),
        WorkMoreTile(),
      ],
    );
  }
}

class WorkTile extends StatelessWidget {
  const WorkTile({required this.icon, required this.label, super.key});

  final IconData icon;
  final String label;

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: AppColors.cardLight,
        borderRadius: BorderRadius.circular(22),
        border: Border.all(color: Colors.white.withOpacity(0.08)),
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [AppColors.cardLight, AppColors.card, AppColors.cyan.withOpacity(0.08)],
        ),
      ),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(icon, color: AppColors.textPrimary, size: 40),
          const SizedBox(height: 8),
          Text(label, style: const TextStyle(fontWeight: FontWeight.w700, color: AppColors.textSecondary)),
        ],
      ),
    );
  }
}

class WorkMoreTile extends StatelessWidget {
  const WorkMoreTile({super.key});

  @override
  Widget build(BuildContext context) {
    return Container(
      alignment: Alignment.center,
      decoration: BoxDecoration(
        color: AppColors.cardLight,
        borderRadius: BorderRadius.circular(22),
      ),
      child: const Text(
        '+ 7',
        style: TextStyle(color: AppColors.textPrimary, fontSize: 24, fontWeight: FontWeight.w900),
      ),
    );
  }
}

class ReviewCard extends StatelessWidget {
  const ReviewCard({required this.name, required this.text, super.key});

  final String name;
  final String text;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: AppColors.card,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: Colors.white.withOpacity(0.06)),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const CircleAvatar(radius: 16, backgroundColor: AppColors.cyan),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(name, style: const TextStyle(fontWeight: FontWeight.w800, color: AppColors.textPrimary)),
                const SizedBox(height: 4),
                Text(text, style: const TextStyle(color: AppColors.textSecondary, height: 1.35, fontSize: 12)),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class ProfessionalSummary extends StatelessWidget {
  const ProfessionalSummary({super.key});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: AppColors.card,
        borderRadius: BorderRadius.circular(20),
      ),
      child: const Row(
        children: [
          CircleAvatar(radius: 24, backgroundColor: AppColors.cyan, child: Icon(Icons.person, color: Colors.black)),
          SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('Beltrano de Tal', style: TextStyle(fontWeight: FontWeight.w900, color: AppColors.textPrimary)),
                SizedBox(height: 4),
                Text('4.9 estrelas · 128 serviços realizados', style: TextStyle(color: AppColors.textSecondary, fontSize: 12)),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class LabeledInput extends StatelessWidget {
  const LabeledInput({
    required this.label,
    required this.hint,
    this.maxLines = 1,
    super.key,
  });

  final String label;
  final String hint;
  final int maxLines;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(label, style: const TextStyle(color: AppColors.textSecondary, fontSize: 12, fontWeight: FontWeight.w700)),
        const SizedBox(height: 8),
        TextField(
          maxLines: maxLines,
          style: const TextStyle(color: AppColors.textPrimary),
          decoration: InputDecoration(
            hintText: hint,
            hintStyle: const TextStyle(color: AppColors.muted, fontSize: 13),
            filled: true,
            fillColor: AppColors.card,
            contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 14),
            border: OutlineInputBorder(
              borderRadius: BorderRadius.circular(14),
              borderSide: BorderSide(color: Colors.white.withOpacity(0.06)),
            ),
            enabledBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(14),
              borderSide: BorderSide(color: Colors.white.withOpacity(0.06)),
            ),
            focusedBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(14),
              borderSide: const BorderSide(color: AppColors.cyan, width: 1.4),
            ),
          ),
        ),
      ],
    );
  }
}
