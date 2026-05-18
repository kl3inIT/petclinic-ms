<!-- PR template — ngắn gọn. Phần nào không relevant thì xoá, đừng để placeholder. -->

## Summary

<!-- 1-3 câu mô tả thay đổi + WHY. CodeRabbit/reviewer đọc trước source code. -->

## Type of change

- [ ] Bug fix (non-breaking)
- [ ] New feature (non-breaking)
- [ ] Breaking change (API contract, DB schema, config key)
- [ ] Refactor / chore / docs (no behavior change)

## Affected services

<!-- Đánh dấu service hoặc module bị thay đổi để reviewer biết blast radius. -->

- [ ] api-gateway
- [ ] auth-service
- [ ] customers-service / vets-service / visits-service
- [ ] genai-service / mcp-server
- [ ] admin-server / config-server / discovery-server
- [ ] mailer-service (Go)
- [ ] shared/* (cẩn thận — ảnh hưởng mọi service)
- [ ] apps/web (FE)
- [ ] infra (compose / Dockerfile / .github)

## Verification

<!-- Bằng chứng concrete đã test. Screenshot UI / curl output BE / log snippet. -->

- [ ] `./gradlew build` pass local
- [ ] `pnpm --filter @petclinic/web typecheck && lint && build` pass
- [ ] Đã test manual qua docker compose hoặc IDE run config
- [ ] Đã update Liquibase migration nếu touch entity
- [ ] Đã update config-repo nếu thêm/đổi property

## Breaking changes / migration notes

<!-- Bỏ trống nếu không có. Nếu có: bullet liệt kê + thứ tự deploy / rollback. -->

## Screenshots / logs

<!-- Optional. UI change → screenshot. API change → curl trước/sau. -->

## Related

<!-- Closes #123, Refs PR/issue link. -->
