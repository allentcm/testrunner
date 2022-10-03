<?php
 
namespace Tests__TestNamespace__;
 
use Tests\Unit\UnitTestCestAbstract;
use UnitTester;
 
class __TestCaseClassName__ extends UnitTestCestAbstract
{
    public function _before(UnitTester $I)
    {
        parent::_before($I);
    }
 
    public function _after(UnitTester $I)
    {
        $this->tester = $I;
    }
}
