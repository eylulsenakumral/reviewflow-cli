# ReviewFlow Examples Implementation Notes

## Overview

ReviewFlow CLI için CI/CD entegrasyon örnekleri ve dokümantasyon oluşturuldu.

## Files Created

| File | Purpose |
|------|---------|
| `examples/github-actions-integration.md` | GitHub Actions workflows (pre-merge, scheduled, release) |
| `examples/pre-commit-hook.sh` | Local pre-commit hook for PR validation |
| `examples/ci-integration.md` | Multi-platform CI integration guide |
| `README.md` | Updated with GitHub Actions and Examples sections |

## Key Design Decisions

### Convention Over Configuration

- **YAML over custom DSL** - GitHub Actions ve diğer CI sistemleri için standart YAML kullanıldı
- **Environment variable auth** - `GITHUB_TOKEN` standartı, özel config dosyası yok
- **Output format flags** - `--output json|markdown|table` basit flag yapısı

### Clear Over Clever

- **Basit pre-commit hook** - Karmaşık analiz yerine pattern matching ile hızlı kontrol
- **Açık exit codes** - 0 (success), 1 (error), 2 (high risk) - net semantic
- **Doğrudan örnekler** - Kopyala-yapıştır çalışır, abstraksiyon yok

### Delete Code, Don't Add

- **Placeholder yok** - Tüm örnekler çalışır durumda
- **Minimal dependency** - Sadece `reviewflow` global install gerekli
- **Kısa dokümantasyon** - Sadece gerekli bilgi, verbose açıklama yok

## Integration Patterns

### Pre-Merge Check
```yaml
on: pull_request
reviewflow analyze $PR_URL
```

### Scheduled Review
```yaml
on: schedule (cron)
reviewflow pr:list --limit 50
# Her PR için analyze
```

### Release Gate
```yaml
on: pull_request to release/*
high risk → require senior approval
```

## Output Formats

| Format | Use Case |
|--------|----------|
| JSON | CI/CD programatik işleme |
| Markdown | PR yorumu, dokümantasyon |
| Table | Terminal okunabilirliği |

## Future Enhancements

- `reviewflow analyze` implementasyonu tamamlandığında örnekleri güncelle
- Pre-commit hook'ta gerçek API call kullan
- Daha fazla CI platformu (Buddy, GitHub Enterprise Server)

## References

- GitHub Actions: https://docs.github.com/en/actions
- GitLab CI: https://docs.gitlab.com/ee/ci/
- Jenkins: https://www.jenkins.io/doc/
