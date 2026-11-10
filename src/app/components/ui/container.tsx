// ============================================================================
// ui/container.tsx — 페이지 겉틀 하나 (2026-11-10 레이아웃 통일)
// ----------------------------------------------------------------------------
// 최대 폭 1520, 가운데, 좌우 안 여백 80(내용 1360). 좁은 화면(1024 미만)은 좌우 여백 16
// 헤더(와 카테고리 메뉴 안쪽), 홈, 둘러보기, 상세, 판매자 페이지, 등록 폼, 푸터가 모두 이걸 써서 좌우 끝이 같음
// 위아래 여백과 배경은 쓰는 쪽이 className 으로 (예: 'pt-8'). as 로 main, section 같은 태그를 고름
// ============================================================================
import * as React from 'react';

type ContainerProps = React.HTMLAttributes<HTMLElement> & {
  as?: 'div' | 'main' | 'section';
};

export function Container({ as: Tag = 'div', className = '', ...rest }: ContainerProps) {
  return <Tag className={`mx-auto w-full max-w-380 px-4 lg:px-20 ${className}`} {...rest} />;
}
