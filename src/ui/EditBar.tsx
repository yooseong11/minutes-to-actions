/**
 * 읽기 모드와 수정 모드가 같은 자리에 서는 버튼.
 *
 * **key가 반드시 있어야 합니다.** 없으면 React가 두 버튼을 같은 자리의 같은
 * <button>으로 보고 DOM 노드를 재사용합니다. 그러면 「수정」을 누른 순간 그
 * 노드의 type이 button → submit으로 바뀌고, 브라우저가 아직 처리 중이던 클릭의
 * 기본 동작이 **폼 제출**이 됩니다. 곧바로 onSubmit이 돌아 편집이 바로 닫힙니다.
 */
export default function EditBar({ editing, onStart }: { editing: boolean; onStart: () => void }) {
  return (
    <div className="tpo-bar">
      {editing ? (
        <button key="save" type="submit" className="button button--quiet button--strong">
          저장
        </button>
      ) : (
        <button key="edit" type="button" className="button button--quiet" onClick={onStart}>
          수정
        </button>
      )}
    </div>
  )
}
