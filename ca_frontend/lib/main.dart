import 'package:flutter/material.dart';

void main() {
  runApp(const ConectaAmaucApp());
}

class ConectaAmaucApp extends StatelessWidget {
  const ConectaAmaucApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      debugShowCheckedModeBanner: false,
      title: 'Conecta Amauc',
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
  static const Color textPrimary = Color(0xFFF2F2F2);
  static const Color textSecondary = Color(0xFFB7B7B7);
  static const Color muted = Color(0xFF777777);
}

// --- NAVEGAÇÃO PRINCIPAL ---
class MainShell extends StatefulWidget {
  const MainShell({super.key});

  @override
  State<MainShell> createState() => _MainShellState();
}

class _MainShellState extends State<MainShell> {
  int _selectedIndex = 0;

  final List<Widget> _pages = [
    const HomePage(),
    const CategoriesPage(),
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
        margin: const EdgeInsets.fromLTRB(40, 0, 40, 20),
        decoration: BoxDecoration(
          color: AppColors.card,
          borderRadius: BorderRadius.circular(30),
          border: Border.all(color: Colors.white.withOpacity(0.05)),
          boxShadow: [
            BoxShadow(
              color: AppColors.cyan.withOpacity(0.1),
              blurRadius: 20,
              offset: const Offset(0, 10),
            ),
          ],
        ),
        child: ClipRRect(
          borderRadius: BorderRadius.circular(30),
          child: BottomNavigationBar(
            currentIndex: _selectedIndex,
            onTap: (index) => setState(() => _selectedIndex = index),
            backgroundColor: Colors.transparent,
            elevation: 0,
            selectedItemColor: AppColors.cyan,
            unselectedItemColor: AppColors.muted,
            showSelectedLabels: true,
            showUnselectedLabels: false,
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
            ],
          ),
        ),
      ),
    );
  }
}

// --- COMPONENTES REUTILIZÁVEIS ---
class AppPage extends StatelessWidget {
  const AppPage({required this.children, this.title, super.key});
  final List<Widget> children;
  final String? title;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: title != null
          ? AppBar(
              backgroundColor: Colors.transparent,
              elevation: 0,
              title: Text(title!, style: const TextStyle(fontWeight: FontWeight.w800)),
              leading: IconButton(
                icon: const Icon(Icons.arrow_back_ios_new_rounded, size: 18),
                onPressed: () => Navigator.pop(context),
              ),
            )
          : null,
      body: Center(
        child: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 430),
          child: SingleChildScrollView(
            padding: const EdgeInsets.fromLTRB(22, 10, 22, 30),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: children,
            ),
          ),
        ),
      ),
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
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.card,
        borderRadius: BorderRadius.circular(20),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(title, style: const TextStyle(color: AppColors.textSecondary, fontWeight: FontWeight.w700, fontSize: 13)),
          const SizedBox(height: 12),
          ...children,
        ],
      ),
    );
  }
}

class SettingsTile extends StatelessWidget {
  const SettingsTile({required this.icon, required this.label, required this.onTap, super.key});
  final IconData icon;
  final String label;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      child: Container(
        margin: const EdgeInsets.only(bottom: 10),
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(color: AppColors.background, borderRadius: BorderRadius.circular(14)),
        child: Row(
          children: [
            Icon(icon, size: 20, color: AppColors.cyan),
            const SizedBox(width: 12),
            Expanded(child: Text(label, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14))),
            const Icon(Icons.arrow_forward_ios_rounded, size: 14, color: AppColors.muted),
          ],
        ),
      ),
    );
  }
}

// --- PÁGINA DE PERFIL (HOME) ---
class HomePage extends StatelessWidget {
  const HomePage({super.key});

  @override
  Widget build(BuildContext context) {
    return AppPage(
      children: [
        const SizedBox(height: 20),
        const Center(
          child: Column(
            children: [
              CircleAvatar(radius: 40, backgroundColor: AppColors.card, child: Icon(Icons.person, size: 40, color: AppColors.cyan)),
              SizedBox(height: 12),
              Text('Conecta Amauc', style: TextStyle(fontSize: 22, fontWeight: FontWeight.w900)),
              Text('Seu portal de serviços locais', style: TextStyle(color: AppColors.textSecondary, fontSize: 13)),
            ],
          ),
        ),
        const SizedBox(height: 30),
        SectionCard(
          title: 'MINHA CONTA',
          children: [
            SettingsTile(
              icon: Icons.person_outline,
              label: 'Informações Pessoais',
              onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const UserProfilePage())),
            ),
            SettingsTile(
              icon: Icons.location_on_outlined,
              label: 'Endereço Salvo',
              onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const AddressPage())),
            ),
            SettingsTile(
              icon: Icons.history,
              label: 'Histórico de Agendamentos',
              onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const HistoryPage())),
            ),
          ],
        ),
        const SizedBox(height: 20),
        ElevatedButton(
          onPressed: () {},
          style: ElevatedButton.styleFrom(
            backgroundColor: Colors.redAccent.withOpacity(0.1),
            foregroundColor: Colors.redAccent,
            elevation: 0,
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(15)),
          ),
          child: const Text('Sair da Conta', style: TextStyle(fontWeight: FontWeight.w700)),
        ),
      ],
    );
  }
}

// --- SUBPÁGINAS DO PERFIL ---
class UserProfilePage extends StatelessWidget {
  const UserProfilePage({super.key});

  @override
  Widget build(BuildContext context) {
    return AppPage(
      title: 'Perfil',
      children: [
        const Center(
          child: CircleAvatar(radius: 50, backgroundColor: AppColors.card, child: Icon(Icons.camera_alt_outlined, color: AppColors.muted)),
        ),
        const SizedBox(height: 24),
        const SectionCard(
          title: 'DADOS DO CLIENTE',
          children: [
            ListTile(title: Text('E-mail logado', style: TextStyle(fontSize: 12, color: AppColors.muted)), subtitle: Text('cliente@exemplo.com')),
            Divider(height: 20, color: Colors.white10),
            ListTile(title: Text('Nome completo', style: TextStyle(fontSize: 12, color: AppColors.muted)), subtitle: Text('Usuário Conecta')),
          ],
        ),
        const SizedBox(height: 16),
        SettingsTile(icon: Icons.lock_outline, label: 'Alterar Senha', onTap: () {}),
        SettingsTile(icon: Icons.logout, label: 'Sair da Conta', onTap: () {}),
      ],
    );
  }
}

class AddressPage extends StatelessWidget {
  const AddressPage({super.key});

  @override
  Widget build(BuildContext context) {
    return AppPage(
      title: 'Endereço Salvo',
      children: [
        const LabeledInput(label: 'Rua', hint: 'Ex: Rua das Flores'),
        const SizedBox(height: 12),
        const Row(
          children: [
            Expanded(child: LabeledInput(label: 'Bairro', hint: 'Centro')),
            SizedBox(width: 12),
            Expanded(child: LabeledInput(label: 'Cidade', hint: 'Concórdia')),
          ],
        ),
        const SizedBox(height: 12),
        const Row(
          children: [
            Expanded(child: LabeledInput(label: 'Estado', hint: 'SC')),
            SizedBox(width: 12),
            Expanded(child: LabeledInput(label: 'Complemento', hint: 'Apto 101')),
          ],
        ),
        const SizedBox(height: 24),
        Row(
          children: [
            Expanded(
              child: ElevatedButton(
                onPressed: () {},
                style: ElevatedButton.styleFrom(backgroundColor: AppColors.cyan, foregroundColor: Colors.black),
                child: const Text('Salvar'),
              ),
            ),
            const SizedBox(width: 12),
            IconButton(onPressed: () {}, icon: const Icon(Icons.delete_outline, color: Colors.redAccent)),
          ],
        ),
      ],
    );
  }
}

class HistoryPage extends StatelessWidget {
  const HistoryPage({super.key});

  @override
  Widget build(BuildContext context) {
    return AppPage(
      title: 'Seus Agendamentos',
      children: [
        const SizedBox(height: 100),
        const Icon(Icons.calendar_today_outlined, size: 60, color: AppColors.muted),
        const SizedBox(height: 16),
        const Center(child: Text('Nenhum agendamento salvo', style: TextStyle(color: AppColors.muted, fontSize: 14))),
        const SizedBox(height: 30),
        ElevatedButton(
          onPressed: () => Navigator.pop(context),
          style: ElevatedButton.styleFrom(backgroundColor: AppColors.cyan, foregroundColor: Colors.black),
          child: const Text('Agendar Agora'),
        ),
      ],
    );
  }
}

// --- PÁGINA DE SERVIÇOS ---
class CategoriesPage extends StatelessWidget {
  const CategoriesPage({super.key});

  @override
  Widget build(BuildContext context) {
    final services = [
      {'icon': Icons.water_drop_outlined, 'title': 'Encanador', 'hasPro': true},
      {'icon': Icons.electrical_services_outlined, 'title': 'Eletricista', 'hasPro': false},
      {'icon': Icons.format_paint_outlined, 'title': 'Pintor', 'hasPro': false},
      {'icon': Icons.chair_outlined, 'title': 'Marceneiro', 'hasPro': false},
      {'icon': Icons.cleaning_services_outlined, 'title': 'Limpeza', 'hasPro': false},
      {'icon': Icons.content_cut, 'title': 'Costura', 'hasPro': false},
    ];

    return AppPage(
      children: [
        const Text('Navegar por Categorias', style: TextStyle(fontSize: 22, fontWeight: FontWeight.w900)),
        const SizedBox(height: 20),
        GridView.builder(
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          itemCount: services.length,
          gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(crossAxisCount: 2, mainAxisSpacing: 16, crossAxisSpacing: 16, childAspectRatio: 1.1),
          itemBuilder: (context, index) {
            final s = services[index];
            return InkWell(
              onTap: s['hasPro'] == true ? () => Navigator.push(context, MaterialPageRoute(builder: (_) => const ProListPage())) : null,
              child: Container(
                decoration: BoxDecoration(color: AppColors.card, borderRadius: BorderRadius.circular(20)),
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    CircleAvatar(backgroundColor: AppColors.cyan, child: Icon(s['icon'] as IconData, color: Colors.black)),
                    const SizedBox(height: 10),
                    Text(s['title'] as String, style: const TextStyle(fontWeight: FontWeight.w700)),
                  ],
                ),
              ),
            );
          },
        ),
      ],
    );
  }
}

// --- FLUXO DO PROFISSIONAL ---
class ProListPage extends StatelessWidget {
  const ProListPage({super.key});

  @override
  Widget build(BuildContext context) {
    return AppPage(
      title: 'Encanadores Disponíveis',
      children: [
        InkWell(
          onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const ProfessionalPage())),
          child: Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(color: AppColors.card, borderRadius: BorderRadius.circular(20), border: Border.all(color: AppColors.cyan.withOpacity(0.2))),
            child: const Row(
              children: [
                CircleAvatar(radius: 25, backgroundColor: AppColors.cyan, child: Icon(Icons.person, color: Colors.black)),
                SizedBox(width: 16),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text('João Antônio', style: TextStyle(fontWeight: FontWeight.w900, fontSize: 16)),
                      Text('Concórdia - SC', style: TextStyle(color: AppColors.textSecondary, fontSize: 12)),
                      SizedBox(height: 4),
                      Row(
                        children: [
                          Icon(Icons.star, color: Colors.amber, size: 14),
                          Text(' 4.9', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
                          Text(' (128 serviços)', style: TextStyle(color: AppColors.muted, fontSize: 12)),
                        ],
                      ),
                    ],
                  ),
                ),
                Icon(Icons.arrow_forward_ios_rounded, size: 16, color: AppColors.cyan),
              ],
            ),
          ),
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
      title: 'Perfil do Profissional',
      children: [
        const Center(
          child: Column(
            children: [
              CircleAvatar(radius: 45, backgroundColor: AppColors.cyan, child: Icon(Icons.person, size: 45, color: Colors.black)),
              SizedBox(height: 12),
              Text('João Antônio', style: TextStyle(fontSize: 20, fontWeight: FontWeight.w900)),
              Text('Especialista em Encanamento e Hidráulica', style: TextStyle(color: AppColors.textSecondary, fontSize: 13)),
            ],
          ),
        ),
        const SizedBox(height: 24),
        const Text('Trabalhos anteriores', style: TextStyle(fontWeight: FontWeight.w700)),
        const SizedBox(height: 12),
        GridView.count(
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          crossAxisCount: 2,
          mainAxisSpacing: 10,
          crossAxisSpacing: 10,
          children: List.generate(4, (i) => Container(decoration: BoxDecoration(color: AppColors.cardLight, borderRadius: BorderRadius.circular(15)), child: const Icon(Icons.image_outlined, color: AppColors.muted))),
        ),
        const SizedBox(height: 24),
        ElevatedButton(
          onPressed: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const ContactProfessionalPage())),
          style: ElevatedButton.styleFrom(backgroundColor: AppColors.cyan, foregroundColor: Colors.black, minimumSize: const Size(double.infinity, 50)),
          child: const Text('Agendar', style: TextStyle(fontWeight: FontWeight.w800)),
        ),
      ],
    );
  }
}

class ContactProfessionalPage extends StatelessWidget {
  const ContactProfessionalPage({super.key});

  @override
  Widget build(BuildContext context) {
    return AppPage(
      title: 'Contratar João Antônio',
      children: [
        const LabeledInput(label: 'Serviço solicitado', hint: 'Ex: Reparo de vazamento'),
        const SizedBox(height: 16),
        const LabeledInput(label: 'Data e Horário', hint: 'Selecione uma data'),
        const SizedBox(height: 16),
        const LabeledInput(label: 'Descrição do problema', hint: 'Conte o que aconteceu...', maxLines: 4),
        const SizedBox(height: 30),
        ElevatedButton(
          onPressed: () {},
          style: ElevatedButton.styleFrom(backgroundColor: AppColors.cyan, foregroundColor: Colors.black, minimumSize: const Size(double.infinity, 50)),
          child: const Text('Enviar Solicitação', style: TextStyle(fontWeight: FontWeight.w800)),
        ),
      ],
    );
  }
}

// --- INPUTS ---
class LabeledInput extends StatelessWidget {
  const LabeledInput({required this.label, required this.hint, this.maxLines = 1, super.key});
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
          decoration: InputDecoration(
            hintText: hint,
            filled: true,
            fillColor: AppColors.card,
            border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide.none),
          ),
        ),
      ],
    );
  }
}
