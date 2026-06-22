import 'package:flutter/material.dart';

class ConectaPalette {
  const ConectaPalette._();

  static const bg = Color(0xFF07111F);
  static const bg2 = Color(0xFF0B182A);
  static const surface = Color(0xFF112238);
  static const surface2 = Color(0xFF172B44);
  static const border = Color(0xFF263D59);
  static const text = Color(0xFFF5F8FF);
  static const muted = Color(0xFF91A6C0);
  static const blue = Color(0xFF2F6DF6);
  static const cyan = Color(0xFF22D3EE);
  static const green = Color(0xFF39FF88);
  static const yellow = Color(0xFFFACC15);
}

class UiProfessional {
  const UiProfessional({
    required this.name,
    required this.role,
    required this.city,
    required this.distance,
    required this.price,
    required this.rating,
    required this.reviews,
    this.imageUrl,
    this.available = true,
    this.verified = false,
    this.responseTime = '~15 min',
    this.bio =
        'Profissional certificado, com atendimento regional e foco em qualidade, prazo e comunicacao clara.',
    this.tags = const ['Instalacao', 'Manutencao', 'Projetos'],
  });

  final String name;
  final String role;
  final String city;
  final String distance;
  final String price;
  final double rating;
  final int reviews;
  final String? imageUrl;
  final bool available;
  final bool verified;
  final String responseTime;
  final String bio;
  final List<String> tags;
}

class UiCategory {
  const UiCategory({
    required this.label,
    required this.icon,
  });

  final String label;
  final IconData icon;
}

const demoProfessionals = [
  UiProfessional(
    name: 'Carlos Mendes',
    role: 'Eletricista Residencial',
    city: 'Concordia',
    distance: '1.2 km',
    price: 'R\$ 80,00',
    rating: 4.9,
    reviews: 128,
    verified: true,
  ),
  UiProfessional(
    name: 'Ana Silva Limpezas',
    role: 'Diarista e Pos-Obra',
    city: 'Seara',
    distance: '8.5 km',
    price: 'R\$ 150,00',
    rating: 5.0,
    reviews: 94,
  ),
  UiProfessional(
    name: 'Roberto Encanador',
    role: 'Vazamentos e Tubulacoes',
    city: 'Concordia',
    distance: '3.4 km',
    price: 'Gratuito',
    rating: 4.8,
    reviews: 42,
    available: false,
  ),
];

const demoCategories = [
  UiCategory(label: 'Manutencao', icon: Icons.build_rounded),
  UiCategory(label: 'Limpeza', icon: Icons.cleaning_services_rounded),
  UiCategory(label: 'Fretes', icon: Icons.local_shipping_rounded),
  UiCategory(label: 'T.I.', icon: Icons.computer_rounded),
  UiCategory(label: 'Beleza', icon: Icons.content_cut_rounded),
  UiCategory(label: 'Pet', icon: Icons.pets_rounded),
  UiCategory(label: 'Obras', icon: Icons.construction_rounded),
  UiCategory(label: 'Outros', icon: Icons.more_horiz_rounded),
];

class ConectaScaffold extends StatelessWidget {
  const ConectaScaffold({super.key, required this.child, this.bottomBar});

  final Widget child;
  final Widget? bottomBar;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: ConectaPalette.bg,
      bottomNavigationBar: bottomBar,
      body: Container(
        decoration: const BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topCenter,
            end: Alignment.bottomCenter,
            colors: [ConectaPalette.bg2, ConectaPalette.bg],
          ),
        ),
        child: Stack(
          children: [
            const _DotGrid(),
            SafeArea(child: child),
          ],
        ),
      ),
    );
  }
}

class ConectaWelcomeScreen extends StatelessWidget {
  const ConectaWelcomeScreen({
    super.key,
    required this.onStart,
    required this.onLogin,
  });

  final VoidCallback onStart;
  final VoidCallback onLogin;

  @override
  Widget build(BuildContext context) {
    return ConectaScaffold(
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 24),
        child: Column(
          children: [
            const Spacer(),
            Container(
              width: 86,
              height: 86,
              decoration: BoxDecoration(
                color: ConectaPalette.blue,
                borderRadius: BorderRadius.circular(22),
                boxShadow: [
                  BoxShadow(
                    color: ConectaPalette.blue.withValues(alpha: 0.35),
                    blurRadius: 36,
                    offset: const Offset(0, 18),
                  ),
                ],
              ),
              child: const Icon(Icons.handshake_rounded,
                  color: Colors.white, size: 42),
            ),
            const SizedBox(height: 28),
            const Text.rich(
              TextSpan(
                text: 'Conecta ',
                children: [
                  TextSpan(
                    text: 'AMAUC',
                    style: TextStyle(color: ConectaPalette.blue),
                  ),
                ],
              ),
              style: TextStyle(
                color: ConectaPalette.text,
                fontSize: 27,
                fontWeight: FontWeight.w900,
              ),
            ),
            const SizedBox(height: 34),
            const Text(
              'Servicos locais, do seu jeito.',
              textAlign: TextAlign.center,
              style: TextStyle(
                color: ConectaPalette.text,
                fontSize: 18,
                fontWeight: FontWeight.w800,
              ),
            ),
            const SizedBox(height: 14),
            const Text(
              'A plataforma profissional que conecta voce aos melhores prestadores de servico da regiao AMAUC.',
              textAlign: TextAlign.center,
              style: TextStyle(
                color: ConectaPalette.muted,
                height: 1.45,
                fontSize: 14,
              ),
            ),
            const SizedBox(height: 44),
            NeonButton(
              label: 'Comecar Agora',
              icon: Icons.arrow_forward_rounded,
              onPressed: onStart,
            ),
            const SizedBox(height: 18),
            TextButton(
              onPressed: onLogin,
              child: const Text.rich(
                TextSpan(
                  text: 'Ja tem uma conta?  ',
                  children: [
                    TextSpan(
                      text: 'Entrar',
                      style: TextStyle(color: ConectaPalette.cyan),
                    ),
                  ],
                ),
                style: TextStyle(color: ConectaPalette.muted),
              ),
            ),
            const Spacer(flex: 2),
          ],
        ),
      ),
    );
  }
}

class ConectaDashboardScreen extends StatelessWidget {
  const ConectaDashboardScreen({
    super.key,
    this.professionals = demoProfessionals,
    this.categories = demoCategories,
    required this.onOpenExplore,
    required this.onOpenProfessional,
  });

  final List<UiProfessional> professionals;
  final List<UiCategory> categories;
  final VoidCallback onOpenExplore;
  final ValueChanged<UiProfessional> onOpenProfessional;

  @override
  Widget build(BuildContext context) {
    return ConectaScaffold(
      bottomBar: const ConectaBottomNav(currentIndex: 0),
      child: CustomScrollView(
        slivers: [
          SliverPadding(
            padding: const EdgeInsets.fromLTRB(18, 18, 18, 0),
            sliver: SliverToBoxAdapter(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const _TopLocationBar(),
                  const SizedBox(height: 16),
                  const SearchField(),
                  const SizedBox(height: 16),
                  const _FilterChips(),
                  const SizedBox(height: 26),
                  SectionHeader(
                    title: 'Perto de mim',
                    action: 'Ver mapa',
                    onAction: onOpenExplore,
                  ),
                ],
              ),
            ),
          ),
          SliverToBoxAdapter(
            child: SizedBox(
              height: 184,
              child: ListView.separated(
                padding: const EdgeInsets.symmetric(horizontal: 18),
                scrollDirection: Axis.horizontal,
                itemBuilder: (_, index) {
                  final professional = professionals[index];
                  return CompactProfessionalCard(
                    professional: professional,
                    onTap: () => onOpenProfessional(professional),
                  );
                },
                separatorBuilder: (_, __) => const SizedBox(width: 14),
                itemCount: professionals.take(3).length,
              ),
            ),
          ),
          SliverPadding(
            padding: const EdgeInsets.fromLTRB(18, 28, 18, 0),
            sliver: SliverToBoxAdapter(
              child: SectionHeader(
                title: 'Categorias',
                action: 'Ver todas',
                onAction: onOpenExplore,
              ),
            ),
          ),
          SliverPadding(
            padding: const EdgeInsets.fromLTRB(18, 12, 18, 0),
            sliver: SliverGrid.builder(
              gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                crossAxisCount: 4,
                mainAxisSpacing: 14,
                crossAxisSpacing: 14,
                childAspectRatio: 0.78,
              ),
              itemCount: categories.length,
              itemBuilder: (_, index) => CategoryTile(category: categories[index]),
            ),
          ),
          const SliverPadding(
            padding: EdgeInsets.fromLTRB(18, 28, 18, 100),
            sliver: SliverToBoxAdapter(child: PromoBanner()),
          ),
        ],
      ),
    );
  }
}

class ConectaExploreScreen extends StatelessWidget {
  const ConectaExploreScreen({
    super.key,
    this.professionals = demoProfessionals,
    required this.onOpenProfessional,
  });

  final List<UiProfessional> professionals;
  final ValueChanged<UiProfessional> onOpenProfessional;

  @override
  Widget build(BuildContext context) {
    return ConectaScaffold(
      bottomBar: const ConectaBottomNav(currentIndex: 1),
      child: ListView(
        padding: const EdgeInsets.fromLTRB(18, 22, 18, 100),
        children: [
          const _PageTitle(
            title: 'Explorar',
            subtitle: 'Encontre profissionais na AMAUC',
          ),
          const SizedBox(height: 18),
          const SearchField(),
          const SizedBox(height: 18),
          const _ExploreFilters(),
          const SizedBox(height: 16),
          const Row(
            children: [
              Text(
                '124 profissionais encontrados',
                style: TextStyle(color: ConectaPalette.muted, fontSize: 12),
              ),
              Spacer(),
              Icon(Icons.sort_rounded, color: ConectaPalette.cyan, size: 16),
              SizedBox(width: 4),
              Text(
                'Ordenar',
                style: TextStyle(color: ConectaPalette.muted, fontSize: 12),
              ),
            ],
          ),
          const SizedBox(height: 18),
          ...professionals.map(
            (p) => Padding(
              padding: const EdgeInsets.only(bottom: 16),
              child: ProfessionalListCard(
                professional: p,
                onTap: () => onOpenProfessional(p),
              ),
            ),
          ),
          OutlinedButton(
            onPressed: () {},
            style: OutlinedButton.styleFrom(
              foregroundColor: ConectaPalette.text,
              side: const BorderSide(color: ConectaPalette.border),
              backgroundColor: ConectaPalette.surface2,
              padding: const EdgeInsets.symmetric(vertical: 15),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(14),
              ),
            ),
            child: const Text('Carregar mais profissionais'),
          ),
        ],
      ),
    );
  }
}

class ConectaProfessionalProfileScreen extends StatelessWidget {
  const ConectaProfessionalProfileScreen({
    super.key,
    required this.professional,
    required this.onBack,
    required this.onRequestBudget,
  });

  final UiProfessional professional;
  final VoidCallback onBack;
  final VoidCallback onRequestBudget;

  @override
  Widget build(BuildContext context) {
    return ConectaScaffold(
      bottomBar: SafeArea(
        minimum: const EdgeInsets.fromLTRB(18, 8, 18, 18),
        child: NeonButton(
          label: 'Solicitar Orcamento',
          icon: Icons.arrow_forward_rounded,
          onPressed: onRequestBudget,
        ),
      ),
      child: Column(
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(14, 12, 14, 0),
            child: Row(
              children: [
                CircleIconButton(icon: Icons.arrow_back, onTap: onBack),
                const Spacer(),
                CircleIconButton(icon: Icons.share_rounded, onTap: () {}),
              ],
            ),
          ),
          Expanded(
            child: ListView(
              padding: const EdgeInsets.fromLTRB(18, 18, 18, 110),
              children: [
                Center(child: ProfessionalAvatar(professional: professional)),
                const SizedBox(height: 18),
                Center(
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Text(
                        professional.name,
                        style: const TextStyle(
                          color: ConectaPalette.text,
                          fontSize: 21,
                          fontWeight: FontWeight.w900,
                        ),
                      ),
                      if (professional.verified) ...[
                        const SizedBox(width: 6),
                        const Icon(Icons.verified_rounded,
                            color: ConectaPalette.cyan, size: 17),
                      ],
                    ],
                  ),
                ),
                const SizedBox(height: 5),
                Center(
                  child: Text(
                    professional.role,
                    style:
                        const TextStyle(color: ConectaPalette.muted, fontSize: 12),
                  ),
                ),
                const SizedBox(height: 18),
                Row(
                  children: [
                    Expanded(
                      child: MetricPill(
                        icon: Icons.star_rounded,
                        text:
                            '${professional.rating} (${professional.reviews} avaliacoes)',
                      ),
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: MetricPill(
                        icon: Icons.location_on_rounded,
                        text: '${professional.city}, SC',
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 12),
                Row(
                  children: [
                    Expanded(
                      child: InfoCard(
                        label: 'Visita tecnica',
                        value: professional.price,
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: InfoCard(
                        label: 'Tempo de resposta',
                        value: professional.responseTime,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 24),
                ProfileSection(
                  icon: Icons.person_outline_rounded,
                  title: 'Sobre o Profissional',
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        professional.bio,
                        style: const TextStyle(
                          color: ConectaPalette.text,
                          height: 1.45,
                        ),
                      ),
                      const SizedBox(height: 14),
                      Wrap(
                        spacing: 8,
                        runSpacing: 8,
                        children: professional.tags
                            .map((tag) => TagPill(label: tag))
                            .toList(),
                      ),
                    ],
                  ),
                ),
                const ProfileSection.collapsed(
                  icon: Icons.format_list_bulleted_rounded,
                  title: 'Servicos e Valores',
                ),
                const ProfileSection.collapsed(
                  icon: Icons.image_outlined,
                  title: 'Portfolio',
                ),
                const ProfileSection.collapsed(
                  icon: Icons.work_outline_rounded,
                  title: 'Experiencia e Formacao',
                ),
                const ProfileSection.collapsed(
                  icon: Icons.schedule_rounded,
                  title: 'Horarios de Atendimento',
                ),
                const ProfileSection.collapsed(
                  icon: Icons.reviews_outlined,
                  title: 'Avaliacoes (128)',
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class NeonButton extends StatelessWidget {
  const NeonButton({
    super.key,
    required this.label,
    required this.onPressed,
    this.icon,
  });

  final String label;
  final VoidCallback onPressed;
  final IconData? icon;

  @override
  Widget build(BuildContext context) {
    return FilledButton(
      onPressed: onPressed,
      style: FilledButton.styleFrom(
        backgroundColor: ConectaPalette.blue,
        foregroundColor: Colors.white,
        minimumSize: const Size.fromHeight(54),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
        textStyle: const TextStyle(fontSize: 15, fontWeight: FontWeight.w900),
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.center,
        mainAxisSize: MainAxisSize.min,
        children: [
          Text(label),
          if (icon != null) ...[
            const SizedBox(width: 9),
            Icon(icon, size: 19),
          ],
        ],
      ),
    );
  }
}

class SearchField extends StatelessWidget {
  const SearchField({super.key});

  @override
  Widget build(BuildContext context) {
    return Container(
      height: 46,
      decoration: BoxDecoration(
        color: ConectaPalette.surface,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: ConectaPalette.border),
      ),
      child: const Row(
        children: [
          SizedBox(width: 14),
          Icon(Icons.search_rounded, color: ConectaPalette.muted, size: 19),
          SizedBox(width: 10),
          Expanded(
            child: Text(
              'Buscar servico ou profissional...',
              style: TextStyle(color: ConectaPalette.muted, fontSize: 13),
            ),
          ),
          CircleAvatar(
            radius: 15,
            backgroundColor: ConectaPalette.surface2,
            child: Icon(Icons.tune_rounded,
                color: ConectaPalette.muted, size: 16),
          ),
          SizedBox(width: 10),
        ],
      ),
    );
  }
}

class SectionHeader extends StatelessWidget {
  const SectionHeader({
    super.key,
    required this.title,
    required this.action,
    required this.onAction,
  });

  final String title;
  final String action;
  final VoidCallback onAction;

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Text(
          title,
          style: const TextStyle(
            color: ConectaPalette.text,
            fontSize: 18,
            fontWeight: FontWeight.w900,
          ),
        ),
        const Spacer(),
        TextButton(
          onPressed: onAction,
          child: Text(
            action,
            style: const TextStyle(color: ConectaPalette.cyan, fontSize: 12),
          ),
        ),
      ],
    );
  }
}

class CompactProfessionalCard extends StatelessWidget {
  const CompactProfessionalCard({
    super.key,
    required this.professional,
    required this.onTap,
  });

  final UiProfessional professional;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: 178,
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          onTap: onTap,
          borderRadius: BorderRadius.circular(18),
          child: Container(
            decoration: _panelDecoration(18),
            clipBehavior: Clip.antiAlias,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Expanded(
                  child: Stack(
                    fit: StackFit.expand,
                    children: [
                      _ImageOrGradient(imageUrl: professional.imageUrl),
                      Positioned(
                        left: 10,
                        top: 10,
                        child: RatingChip(
                          rating: professional.rating,
                          reviews: null,
                        ),
                      ),
                    ],
                  ),
                ),
                Padding(
                  padding: const EdgeInsets.all(13),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        professional.name,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(
                          color: ConectaPalette.text,
                          fontWeight: FontWeight.w900,
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        professional.role,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(
                          color: ConectaPalette.muted,
                          fontSize: 11,
                        ),
                      ),
                      const SizedBox(height: 10),
                      Row(
                        children: [
                          Expanded(
                            child: Text(
                              'A partir de\n${professional.price}',
                              style: const TextStyle(
                                color: ConectaPalette.text,
                                fontSize: 11,
                                fontWeight: FontWeight.w800,
                              ),
                            ),
                          ),
                          SmallCTA(label: 'Agendar', onTap: onTap),
                        ],
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class ProfessionalListCard extends StatelessWidget {
  const ProfessionalListCard({
    super.key,
    required this.professional,
    required this.onTap,
  });

  final UiProfessional professional;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: _panelDecoration(18),
      child: Row(
        children: [
          SizedBox(
            width: 72,
            height: 72,
            child: ClipRRect(
              borderRadius: BorderRadius.circular(16),
              child: _ImageOrGradient(imageUrl: professional.imageUrl),
            ),
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Expanded(
                      child: Text(
                        professional.name,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(
                          color: ConectaPalette.text,
                          fontSize: 15,
                          fontWeight: FontWeight.w900,
                        ),
                      ),
                    ),
                    const Icon(Icons.favorite_border_rounded,
                        color: ConectaPalette.muted, size: 19),
                  ],
                ),
                const SizedBox(height: 3),
                Text(
                  professional.role,
                  style:
                      const TextStyle(color: ConectaPalette.cyan, fontSize: 12),
                ),
                const SizedBox(height: 9),
                Row(
                  children: [
                    RatingChip(
                      rating: professional.rating,
                      reviews: professional.reviews,
                    ),
                    const SizedBox(width: 8),
                    Text(
                      '${professional.city} • ${professional.distance}',
                      style: const TextStyle(
                          color: ConectaPalette.muted, fontSize: 11),
                    ),
                  ],
                ),
                const SizedBox(height: 12),
                Row(
                  children: [
                    Expanded(
                      child: Text(
                        'Visita a partir de\n${professional.price}',
                        style: const TextStyle(
                          color: ConectaPalette.text,
                          fontSize: 11,
                          fontWeight: FontWeight.w800,
                        ),
                      ),
                    ),
                    AvailabilityBadge(available: professional.available),
                    const SizedBox(width: 8),
                    SmallCTA(label: 'Ver Perfil', onTap: onTap),
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class ProfileSection extends StatelessWidget {
  const ProfileSection({
    super.key,
    required this.icon,
    required this.title,
    required this.child,
  }) : collapsed = false;

  const ProfileSection.collapsed({
    super.key,
    required this.icon,
    required this.title,
  })  : child = const SizedBox.shrink(),
        collapsed = true;

  final IconData icon;
  final String title;
  final Widget child;
  final bool collapsed;

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(bottom: 14),
      padding: const EdgeInsets.all(16),
      decoration: _panelDecoration(16),
      child: Column(
        children: [
          Row(
            children: [
              Icon(icon, color: ConectaPalette.cyan, size: 18),
              const SizedBox(width: 10),
              Expanded(
                child: Text(
                  title,
                  style: const TextStyle(
                    color: ConectaPalette.text,
                    fontWeight: FontWeight.w900,
                  ),
                ),
              ),
              const Icon(Icons.keyboard_arrow_down_rounded,
                  color: ConectaPalette.muted),
            ],
          ),
          if (!collapsed) ...[
            const SizedBox(height: 16),
            child,
          ],
        ],
      ),
    );
  }
}

class CategoryTile extends StatelessWidget {
  const CategoryTile({super.key, required this.category});

  final UiCategory category;

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Expanded(
          child: Container(
            decoration: _panelDecoration(15),
            child: Icon(category.icon, color: ConectaPalette.cyan, size: 24),
          ),
        ),
        const SizedBox(height: 8),
        Text(
          category.label,
          maxLines: 1,
          overflow: TextOverflow.ellipsis,
          style: const TextStyle(
            color: ConectaPalette.text,
            fontSize: 11,
            fontWeight: FontWeight.w800,
          ),
        ),
      ],
    );
  }
}

class PromoBanner extends StatelessWidget {
  const PromoBanner({super.key});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: ConectaPalette.blue.withValues(alpha: 0.55),
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: ConectaPalette.cyan.withValues(alpha: 0.25)),
      ),
      child: const Row(
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'ESPECIAL',
                  style: TextStyle(
                    color: ConectaPalette.text,
                    fontSize: 10,
                    fontWeight: FontWeight.w900,
                  ),
                ),
                SizedBox(height: 6),
                Text(
                  'Desconto em Servicos de Climatizacao',
                  style: TextStyle(
                    color: Colors.white,
                    fontSize: 16,
                    fontWeight: FontWeight.w900,
                    height: 1.05,
                  ),
                ),
              ],
            ),
          ),
          Icon(Icons.ac_unit_rounded, color: Colors.white, size: 58),
        ],
      ),
    );
  }
}

class ConectaBottomNav extends StatelessWidget {
  const ConectaBottomNav({super.key, required this.currentIndex});

  final int currentIndex;

  @override
  Widget build(BuildContext context) {
    const items = [
      _NavItem(Icons.home_rounded, 'Inicio'),
      _NavItem(Icons.explore_rounded, 'Explorar'),
      _NavItem(Icons.event_note_rounded, 'Agenda'),
      _NavItem(Icons.favorite_border_rounded, 'Favoritos'),
      _NavItem(Icons.person_outline_rounded, 'Perfil'),
    ];

    return Container(
      decoration: const BoxDecoration(
        color: ConectaPalette.bg,
        border: Border(top: BorderSide(color: ConectaPalette.border)),
      ),
      padding: const EdgeInsets.fromLTRB(8, 8, 8, 12),
      child: SafeArea(
        child: Row(
          mainAxisAlignment: MainAxisAlignment.spaceAround,
          children: List.generate(items.length, (index) {
            final selected = index == currentIndex;
            return Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Icon(
                  items[index].icon,
                  color: selected ? ConectaPalette.cyan : ConectaPalette.muted,
                  size: 22,
                ),
                const SizedBox(height: 4),
                Text(
                  items[index].label,
                  style: TextStyle(
                    color:
                        selected ? ConectaPalette.cyan : ConectaPalette.muted,
                    fontSize: 10,
                    fontWeight: selected ? FontWeight.w900 : FontWeight.w600,
                  ),
                ),
              ],
            );
          }),
        ),
      ),
    );
  }
}

class _NavItem {
  const _NavItem(this.icon, this.label);

  final IconData icon;
  final String label;
}

class RatingChip extends StatelessWidget {
  const RatingChip({super.key, required this.rating, this.reviews});

  final double rating;
  final int? reviews;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 4),
      decoration: BoxDecoration(
        color: ConectaPalette.bg.withValues(alpha: 0.78),
        borderRadius: BorderRadius.circular(8),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          const Icon(Icons.star_rounded, size: 13, color: ConectaPalette.yellow),
          const SizedBox(width: 3),
          Text(
            reviews == null ? '$rating' : '$rating ($reviews)',
            style: const TextStyle(
              color: ConectaPalette.text,
              fontSize: 10,
              fontWeight: FontWeight.w900,
            ),
          ),
        ],
      ),
    );
  }
}

class SmallCTA extends StatelessWidget {
  const SmallCTA({super.key, required this.label, required this.onTap});

  final String label;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(8),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
        decoration: BoxDecoration(
          color: ConectaPalette.blue.withValues(alpha: 0.95),
          borderRadius: BorderRadius.circular(8),
        ),
        child: Text(
          label,
          style: const TextStyle(
            color: Colors.white,
            fontSize: 10,
            fontWeight: FontWeight.w900,
          ),
        ),
      ),
    );
  }
}

class AvailabilityBadge extends StatelessWidget {
  const AvailabilityBadge({super.key, required this.available});

  final bool available;

  @override
  Widget build(BuildContext context) {
    final color = available ? ConectaPalette.green : ConectaPalette.muted;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 7),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.12),
        borderRadius: BorderRadius.circular(8),
      ),
      child: Text(
        available ? 'Disponivel' : 'Ocupado',
        style: TextStyle(
          color: color,
          fontSize: 10,
          fontWeight: FontWeight.w900,
        ),
      ),
    );
  }
}

class MetricPill extends StatelessWidget {
  const MetricPill({super.key, required this.icon, required this.text});

  final IconData icon;
  final String text;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
      decoration: _panelDecoration(12),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(icon, color: ConectaPalette.yellow, size: 16),
          const SizedBox(width: 6),
          Flexible(
            child: Text(
              text,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: const TextStyle(
                color: ConectaPalette.text,
                fontSize: 11,
                fontWeight: FontWeight.w800,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class InfoCard extends StatelessWidget {
  const InfoCard({super.key, required this.label, required this.value});

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: _panelDecoration(14),
      child: Column(
        children: [
          Text(
            label.toUpperCase(),
            style: const TextStyle(
              color: ConectaPalette.muted,
              fontSize: 9,
              fontWeight: FontWeight.w800,
            ),
          ),
          const SizedBox(height: 6),
          Text(
            value,
            style: const TextStyle(
              color: ConectaPalette.text,
              fontWeight: FontWeight.w900,
            ),
          ),
        ],
      ),
    );
  }
}

class TagPill extends StatelessWidget {
  const TagPill({super.key, required this.label});

  final String label;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 7),
      decoration: BoxDecoration(
        color: ConectaPalette.bg,
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: ConectaPalette.border),
      ),
      child: Text(
        label,
        style: const TextStyle(
          color: ConectaPalette.text,
          fontSize: 11,
          fontWeight: FontWeight.w700,
        ),
      ),
    );
  }
}

class ProfessionalAvatar extends StatelessWidget {
  const ProfessionalAvatar({super.key, required this.professional});

  final UiProfessional professional;

  @override
  Widget build(BuildContext context) {
    return Stack(
      clipBehavior: Clip.none,
      children: [
        Container(
          width: 96,
          height: 96,
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(22),
            border: Border.all(color: ConectaPalette.border),
          ),
          clipBehavior: Clip.antiAlias,
          child: _ImageOrGradient(imageUrl: professional.imageUrl),
        ),
        if (professional.available)
          Positioned(
            right: -2,
            bottom: -2,
            child: Container(
              width: 18,
              height: 18,
              decoration: BoxDecoration(
                color: ConectaPalette.green,
                shape: BoxShape.circle,
                border: Border.all(color: ConectaPalette.bg, width: 3),
              ),
            ),
          ),
      ],
    );
  }
}

class CircleIconButton extends StatelessWidget {
  const CircleIconButton({super.key, required this.icon, required this.onTap});

  final IconData icon;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      customBorder: const CircleBorder(),
      child: Container(
        width: 38,
        height: 38,
        decoration: const BoxDecoration(
          color: ConectaPalette.surface,
          shape: BoxShape.circle,
        ),
        child: Icon(icon, color: ConectaPalette.text, size: 18),
      ),
    );
  }
}

class _TopLocationBar extends StatelessWidget {
  const _TopLocationBar();

  @override
  Widget build(BuildContext context) {
    return const Row(
      children: [
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'Localizacao atual',
                style: TextStyle(color: ConectaPalette.muted, fontSize: 11),
              ),
              SizedBox(height: 3),
              Row(
                children: [
                  Icon(Icons.location_on_rounded,
                      color: ConectaPalette.cyan, size: 14),
                  SizedBox(width: 4),
                  Text(
                    'Concordia, SC',
                    style: TextStyle(
                      color: ConectaPalette.text,
                      fontWeight: FontWeight.w900,
                    ),
                  ),
                  Icon(Icons.keyboard_arrow_down_rounded,
                      color: ConectaPalette.muted, size: 16),
                ],
              ),
            ],
          ),
        ),
        CircleAvatar(
          radius: 20,
          backgroundColor: ConectaPalette.surface,
          child: Icon(Icons.notifications_none_rounded,
              color: ConectaPalette.text),
        ),
      ],
    );
  }
}

class _PageTitle extends StatelessWidget {
  const _PageTitle({required this.title, required this.subtitle});

  final String title;
  final String subtitle;

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                title,
                style: const TextStyle(
                  color: ConectaPalette.text,
                  fontSize: 22,
                  fontWeight: FontWeight.w900,
                ),
              ),
              const SizedBox(height: 4),
              Text(
                subtitle,
                style:
                    const TextStyle(color: ConectaPalette.muted, fontSize: 12),
              ),
            ],
          ),
        ),
        const CircleAvatar(
          radius: 20,
          backgroundColor: ConectaPalette.surface,
          child: Icon(Icons.notifications_none_rounded,
              color: ConectaPalette.text),
        ),
      ],
    );
  }
}

class _FilterChips extends StatelessWidget {
  const _FilterChips();

  @override
  Widget build(BuildContext context) {
    return const SingleChildScrollView(
      scrollDirection: Axis.horizontal,
      child: Row(
        children: [
          _FilterChip(label: 'Disponivel hoje', icon: Icons.flash_on_rounded),
          _FilterChip(label: 'Melhor avaliacao', icon: Icons.star_rounded),
          _FilterChip(label: 'Verificados', icon: Icons.verified_rounded),
        ],
      ),
    );
  }
}

class _ExploreFilters extends StatelessWidget {
  const _ExploreFilters();

  @override
  Widget build(BuildContext context) {
    return const SingleChildScrollView(
      scrollDirection: Axis.horizontal,
      child: Row(
        children: [
          _FilterChip(label: 'Todos', selected: true),
          _FilterChip(label: 'Categoria', icon: Icons.keyboard_arrow_down),
          _FilterChip(label: 'Distancia', icon: Icons.keyboard_arrow_down),
          _FilterChip(label: 'Preco', icon: Icons.keyboard_arrow_down),
        ],
      ),
    );
  }
}

class _FilterChip extends StatelessWidget {
  const _FilterChip({required this.label, this.icon, this.selected = false});

  final String label;
  final IconData? icon;
  final bool selected;

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(right: 10),
      padding: const EdgeInsets.symmetric(horizontal: 13, vertical: 9),
      decoration: BoxDecoration(
        color: selected ? ConectaPalette.blue : ConectaPalette.surface,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(
          color: selected ? ConectaPalette.blue : ConectaPalette.border,
        ),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          if (icon != null) ...[
            Icon(icon,
                color: selected ? Colors.white : ConectaPalette.cyan, size: 14),
            const SizedBox(width: 5),
          ],
          Text(
            label,
            style: TextStyle(
              color: selected ? Colors.white : ConectaPalette.text,
              fontSize: 12,
              fontWeight: FontWeight.w800,
            ),
          ),
        ],
      ),
    );
  }
}

class _ImageOrGradient extends StatelessWidget {
  const _ImageOrGradient({this.imageUrl});

  final String? imageUrl;

  @override
  Widget build(BuildContext context) {
    if (imageUrl != null && imageUrl!.isNotEmpty) {
      return Image.network(imageUrl!, fit: BoxFit.cover);
    }

    return Container(
      decoration: const BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [Color(0xFF27415F), Color(0xFF0D1B2E)],
        ),
      ),
      child: const Icon(Icons.person_rounded,
          color: ConectaPalette.muted, size: 34),
    );
  }
}

class _DotGrid extends StatelessWidget {
  const _DotGrid();

  @override
  Widget build(BuildContext context) {
    return IgnorePointer(
      child: CustomPaint(
        painter: _DotGridPainter(),
        size: Size.infinite,
      ),
    );
  }
}

class _DotGridPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = ConectaPalette.border.withValues(alpha: 0.22)
      ..strokeWidth = 1;
    for (double x = 10; x < size.width; x += 18) {
      for (double y = 10; y < size.height; y += 18) {
        canvas.drawCircle(Offset(x, y), 0.8, paint);
      }
    }
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}

BoxDecoration _panelDecoration(double radius) {
  return BoxDecoration(
    color: ConectaPalette.surface,
    borderRadius: BorderRadius.circular(radius),
    border: Border.all(color: ConectaPalette.border),
  );
}
