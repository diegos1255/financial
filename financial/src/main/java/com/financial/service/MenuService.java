package com.financial.service;

import com.financial.dto.MenuResponse;
import com.financial.model.Menu;
import com.financial.repository.MenuRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
public class MenuService {

    private final MenuRepository repository;
    private final boolean investmentsEnabled;

    public MenuService(MenuRepository repository,
                       @Value("${features.investments-enabled:true}") boolean investmentsEnabled) {
        this.repository = repository;
        this.investmentsEnabled = investmentsEnabled;
    }

    @Transactional(readOnly = true)
    public List<MenuResponse> tree() {
        List<Menu> all = repository.findAllByActiveTrueOrderBySortOrderAsc().stream()
                .filter(m -> investmentsEnabled || !"/investments".equals(m.getRoute()))
                .toList();

        Map<UUID, List<MenuResponse>> childrenByParentId = new HashMap<>();
        List<MenuResponse> roots = new ArrayList<>();

        Map<UUID, UUID> parentByChild = new HashMap<>();
        Map<UUID, MenuResponse> responseById = new HashMap<>();

        for (Menu menu : all) {
            MenuResponse node = new MenuResponse(
                    menu.getId(),
                    menu.getLabel(),
                    menu.getRoute(),
                    menu.getIcon(),
                    menu.getSortOrder(),
                    new ArrayList<>()
            );
            responseById.put(menu.getId(), node);
            UUID parentId = menu.getParent() != null ? menu.getParent().getId() : null;
            if (parentId != null) {
                parentByChild.put(menu.getId(), parentId);
            } else {
                roots.add(node);
            }
        }

        for (Map.Entry<UUID, UUID> e : parentByChild.entrySet()) {
            MenuResponse child = responseById.get(e.getKey());
            MenuResponse parent = responseById.get(e.getValue());
            if (parent != null) {
                parent.children().add(child);
            } else {
                roots.add(child);
            }
        }

        Comparator<MenuResponse> bySortOrder = Comparator.comparing(MenuResponse::sortOrder);
        roots.sort(bySortOrder);
        for (MenuResponse node : responseById.values()) {
            node.children().sort(bySortOrder);
        }

        return roots;
    }
}
